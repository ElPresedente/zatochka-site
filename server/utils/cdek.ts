import https from 'node:https'
import { gunzipSync } from 'node:zlib'

interface CdekTokenCache {
  token: string
  expiresAt: number
}

async function getCdekToken(): Promise<string> {
  const config = useRuntimeConfig()
  const storage = useStorage('cdek')

  const cached = await storage.getItem<CdekTokenCache>('token')
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }

  const baseUrl = config.cdekTestMode
    ? 'https://api.edu.cdek.ru'
    : 'https://api.cdek.ru'

  const resp = await $fetch<{ access_token: string; expires_in: number }>(
    `${baseUrl}/v2/oauth/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.cdekAccount,
        client_secret: config.cdekSecure,
      }).toString(),
    },
  )

  const expiresAt = Date.now() + resp.expires_in * 1000
  await storage.setItem<CdekTokenCache>('token', { token: resp.access_token, expiresAt })

  return resp.access_token
}

export async function cdekRequest<T = unknown>(
  path: string,
  method: string,
  body?: unknown,
  params?: string,
): Promise<T> {
  const config = useRuntimeConfig()
  const token = await getCdekToken()
  const baseUrl = config.cdekTestMode
    ? 'https://api.edu.cdek.ru'
    : 'https://api.cdek.ru'

  const url = baseUrl + path + (params || '')

  return $fetch<T>(url, {
    method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// Протокол виджета CDEK v3 (эталонный dist/service.php): action приходит в query
// ИЛИ в JSON-теле (сервис мёржит оба), и диспатчится по имени. Реализованы те же
// действия, что у виджета: offices (GET deliverypoints) и calculate (POST tarifflist).
const WIDGET_ACTIONS: Record<string, { path: string; method: 'GET' | 'POST' }> = {
  offices: { path: '/v2/deliverypoints', method: 'GET' },
  calculate: { path: '/v2/calculator/tarifflist', method: 'POST' },
}

// Боевой /v2/deliverypoints?country_code=RU отдаёт ~18 МБ JSON (≈10 000 ПВЗ).
// Раньше прокси через $fetch его распаковывал, парсил (JSON.parse) и Nitro
// пересериализовывал на отдаче — ~0.6 с синхронной работы блокировали event loop
// и подвешивали весь сайт; плюс клиент качал все 18 МБ.
//
// Решение: СДЭК отдаёт это тело gzip (~3 МБ). Тянем СЫРЫЕ gzip-байты низкоуровневым
// https (обычный fetch их распаковал бы обратно в 18 МБ) и отдаём браузеру как есть
// с Content-Encoding: gzip. Наш сервер ничего не распаковывает, не парсит и не
// пересериализует, а клиент качает 3 МБ вместо 18. Кэш в памяти процесса.
const OFFICES_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 часов

// СДЭК поддерживает пагинацию: при page/size возвращает страницу + заголовки
// X-Total-Elements / X-Total-Pages. Виджет читает x-total-elements из пробного
// запроса (page=1&size=1) и затем тянет страницы по 500. КРИТИЧНО форвардить эти
// заголовки клиенту — иначе виджет уходит в else-ветку и качает весь список одним
// запросом (page=0 → 18 МБ). Поэтому fetchCdekRaw возвращает и тело, и тоталы.
export interface CdekOfficesResponse {
  body: Buffer
  encoding: string | null
  contentType: string
  totalElements: string | null
  totalPages: string | null
}
interface CdekOfficesCacheEntry extends CdekOfficesResponse {
  expiresAt: number
}
const officesCache = new Map<string, CdekOfficesCacheEntry>()

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function fetchCdekRaw(url: string, token: string): Promise<CdekOfficesResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
        },
        timeout: 30_000,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', c => chunks.push(c as Buffer))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          const status = res.statusCode ?? 502
          if (status < 200 || status >= 300) {
            console.error('[CDEK] offices error', status, body.toString('utf8').slice(0, 500))
            reject(createError({ statusCode: status, message: 'CDEK API error' }))
            return
          }
          resolve({
            body,
            encoding: firstHeader(res.headers['content-encoding']),
            contentType: firstHeader(res.headers['content-type']) ?? 'application/json',
            totalElements: firstHeader(res.headers['x-total-elements']),
            totalPages: firstHeader(res.headers['x-total-pages']),
          })
        })
        res.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error('CDEK request timeout')))
    req.on('error', reject)
    req.end()
  })
}

// Ключ кэша строим из ОТСОРТИРОВАННЫХ параметров — чтобы порядок ключей в запросе
// виджета и в прогреве не влиял на совпадение (page/size/size оставляем в ключе:
// они различают пробный запрос и страницы, ответы реально разные).
function officesCacheKey(params: Record<string, any>): string {
  const entries = Object.entries(params)
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
  return new URLSearchParams(entries).toString()
}

export async function cdekOfficesRaw(params: Record<string, any>): Promise<CdekOfficesResponse> {
  const key = officesCacheKey(params)

  const cached = officesCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached
  }

  const config = useRuntimeConfig()
  const token = await getCdekToken()
  const baseUrl = config.cdekTestMode ? 'https://api.edu.cdek.ru' : 'https://api.cdek.ru'
  const url = `${baseUrl}/v2/deliverypoints${key ? `?${key}` : ''}`

  const resp = await fetchCdekRaw(url, token)
  officesCache.set(key, { ...resp, expiresAt: Date.now() + OFFICES_CACHE_TTL_MS })
  return resp
}

// Распаковать gzip-тело offices — для редкого клиента без поддержки gzip.
export function gunzipOfficesBody(resp: CdekOfficesResponse): Buffer {
  if (resp.encoding === 'gzip') return gunzipSync(resp.body)
  return resp.body
}

// Прогрев кэша ПВЗ при старте сервера: повторяем ровно ту же последовательность,
// что делает виджет (server-side getOffices) — пробный запрос за x-total-elements,
// затем все страницы по 500. Так ключи кэша совпадают с будущими запросами виджета,
// и первый пользователь получает список из кэша без ожидания. Без sender → is_handout.
const OFFICES_PAGE_SIZE = 500

export async function warmCdekOfficesCache(): Promise<{ pages: number; total: number }> {
  const probe = await cdekOfficesRaw({ is_handout: true, page: 1, size: 1 })
  const total = Number.parseInt(probe.totalElements ?? '', 10)
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`no x-total-elements (got "${probe.totalElements}")`)
  }
  const pages = Math.ceil(total / OFFICES_PAGE_SIZE)
  await Promise.all(
    Array.from({ length: pages }, (_, t) =>
      cdekOfficesRaw({ is_handout: true, page: t, size: OFFICES_PAGE_SIZE }),
    ),
  )
  return { pages, total }
}

export async function cdekWidgetRequest(data: Record<string, any>): Promise<unknown> {
  const action = data?.action
  if (!action || typeof action !== 'string') {
    throw createError({ statusCode: 400, message: 'Action is required' })
  }
  const route = WIDGET_ACTIONS[action]
  if (!route) {
    throw createError({ statusCode: 400, message: `Unknown CDEK action: ${action}` })
  }

  const { action: _omit, ...params } = data

  try {
    if (route.method === 'POST') {
      // calculate: from_location/to_location/packages — вложенные объекты, нужен JSON-body
      return await cdekRequest(route.path, 'POST', params)
    }
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    ).toString()
    return await cdekRequest(route.path, 'GET', undefined, qs ? `?${qs}` : '')
  }
  catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status ?? 502
    const cdekBody = err?.data ?? err?.response?._data
    console.error('[CDEK] widget action error', action, status, JSON.stringify(cdekBody)?.slice(0, 500))
    throw createError({ statusCode: status, message: 'CDEK API error', data: cdekBody })
  }
}

export interface CdekTariffCalcBody {
  tariff_code?: number
  type?: number
  from_location: { code: number } | { address: string }
  to_location: { code: number } | { address: string }
  packages: Array<{ weight: number; length: number; width: number; height: number }>
}

export interface CdekTariffResult {
  tariff_code: number
  tariff_name: string
  delivery_sum: number
  period_min: number
  period_max: number
}

export async function cdekCalculateTariff(body: CdekTariffCalcBody): Promise<CdekTariffResult[]> {
  const resp = await cdekRequest<{ tariff_codes?: CdekTariffResult[]; delivery_sum?: number; period_min?: number; period_max?: number }>(
    '/v2/calculator/tarifflist',
    'POST',
    body,
  )
  return resp.tariff_codes ?? []
}

export interface CdekOrderInput {
  tariff_code: number
  sender: {
    company?: string
    name: string
    phones: Array<{ number: string }>
    email?: string
  }
  recipient: {
    name: string
    phones: Array<{ number: string }>
    email?: string
  }
  from_location: { code: number }
  delivery_point: string
  packages: Array<{
    number: string
    weight: number
    length: number
    width: number
    height: number
    items: Array<{
      name: string
      ware_key: string
      payment: { value: number }
      cost: number
      amount: number
      weight: number
    }>
  }>
  comment?: string
}

export async function cdekCreateOrder(order: CdekOrderInput): Promise<{ entity?: { uuid: string }; requests?: Array<{ errors?: unknown[] }> }> {
  return cdekRequest('/v2/orders', 'POST', order)
}
