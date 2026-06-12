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

// Код города-отправителя CDEK (Орёл). Используется и при расчёте тарифа в корзине,
// и при серверной перепроверке тарифа в заказе — чтобы значения совпадали.
export const CDEK_SENDER_CITY_CODE = 149

// ── Поиск города по названию (автодополнение в корзине) ──
// Ответ небольшой; кэшируем по нормализованному запросу.
export interface CdekCityDto {
  code: number
  city: string
  region: string
  lon: number
  lat: number
}

const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 часа
const cityCache = new Map<string, { data: CdekCityDto[]; expiresAt: number }>()

export async function cdekCities(query: string): Promise<CdekCityDto[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const key = q.toLowerCase()
  const cached = cityCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const qs = new URLSearchParams({ country_code: 'RU', city: q, size: '10' }).toString()
  const raw = await cdekRequest<any[]>('/v2/location/cities', 'GET', undefined, `?${qs}`)

  const data: CdekCityDto[] = (Array.isArray(raw) ? raw : [])
    .map(c => ({
      code: Number(c.code),
      city: String(c.city ?? ''),
      region: String(c.region ?? ''),
      lon: Number(c.longitude),
      lat: Number(c.latitude),
    }))
    .filter(c => Number.isFinite(c.code) && c.city)

  cityCache.set(key, { data, expiresAt: Date.now() + CITY_CACHE_TTL_MS })
  return data
}

// ── ПВЗ выбранного города ──
// СДЭК отдаёт точки только этого города (даже Москва ≈ 486), поэтому парсим и
// кэшируем спокойно — это не общероссийские 18 МБ.
export interface CdekOfficeDto {
  code: string
  name: string
  address: string
  city: string
  lon: number
  lat: number
  workTime: string
  type: string
}

const OFFICES_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 часов
const cityOfficesCache = new Map<number, { data: CdekOfficeDto[]; expiresAt: number }>()

export async function cdekCityOffices(cityCode: number): Promise<CdekOfficeDto[]> {
  const cached = cityOfficesCache.get(cityCode)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const qs = new URLSearchParams({ is_handout: 'true', city_code: String(cityCode) }).toString()
  const raw = await cdekRequest<any[]>('/v2/deliverypoints', 'GET', undefined, `?${qs}`)

  const data: CdekOfficeDto[] = (Array.isArray(raw) ? raw : [])
    .map(p => ({
      code: String(p.code ?? ''),
      name: String(p.name ?? ''),
      address: String(p.location?.address ?? ''),
      city: String(p.location?.city ?? ''),
      lon: Number(p.location?.longitude),
      lat: Number(p.location?.latitude),
      workTime: String(p.work_time ?? ''),
      type: String(p.type ?? 'PVZ'),
    }))
    .filter(p => p.code && Number.isFinite(p.lon) && Number.isFinite(p.lat))

  cityOfficesCache.set(cityCode, { data, expiresAt: Date.now() + OFFICES_CACHE_TTL_MS })
  return data
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
  delivery_mode?: number
  delivery_sum: number
  period_min: number
  period_max: number
}

export async function cdekCalculateTariff(body: CdekTariffCalcBody): Promise<CdekTariffResult[]> {
  const resp = await cdekRequest<{ tariff_codes?: CdekTariffResult[] }>(
    '/v2/calculator/tarifflist',
    'POST',
    body,
  )
  return resp.tariff_codes ?? []
}

export interface CdekOfficeTariff {
  code: number
  sum: number
  daysMin: number
  daysMax: number
}

export type CdekPackage = { weight: number; length: number; width: number; height: number }

// Тариф доставки до ПВЗ: считаем от Орла до города-получателя и берём самый дешёвый
// тариф «склад-склад» (delivery_mode === 4 = до ПВЗ). Один источник истины для
// корзины и серверной перепроверки заказа.
export async function cdekOfficeTariff(
  toCityCode: number,
  packages: CdekPackage[],
): Promise<CdekOfficeTariff | null> {
  const tariffs = await cdekCalculateTariff({
    from_location: { code: CDEK_SENDER_CITY_CODE },
    to_location: { code: toCityCode },
    packages,
  })
  const office = tariffs.filter(t => t.delivery_mode === 4)
  const list = office.length ? office : tariffs
  if (!list.length) return null

  const cheapest = list.reduce((a, b) => (b.delivery_sum < a.delivery_sum ? b : a))
  return {
    code: cheapest.tariff_code,
    sum: Math.round(cheapest.delivery_sum),
    daysMin: cheapest.period_min,
    daysMax: cheapest.period_max,
  }
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

// Удаление (отмена) заказа в СДЭК по внутреннему UUID.
// СДЭК отвечает 200 даже если удаление невозможно (посылка уже принята в работу) —
// в этом случае ошибки приходят в requests[].errors, поэтому бросаем, чтобы вызывающий
// мог залогировать необходимость ручной отмены.
export async function cdekDeleteOrder(uuid: string): Promise<void> {
  const resp = await cdekRequest<{ requests?: Array<{ errors?: unknown[] }> }>(
    `/v2/orders/${uuid}`,
    'DELETE',
  )
  const errors = (resp?.requests ?? []).flatMap(r => r.errors ?? [])
  if (errors.length) {
    throw new Error(`CDEK delete rejected: ${JSON.stringify(errors)}`)
  }
}
