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
