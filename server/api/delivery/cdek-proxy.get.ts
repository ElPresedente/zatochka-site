import { cdekRequest } from '~/server/utils/cdek'

// The CDEK widget @3 sends GET requests with ?action=<name>&...params
// to servicePath instead of a JSON body.  Map each action to the CDEK API path.
const ACTION_PATH: Record<string, string> = {
  offices: '/v2/deliverypoints',
  calculate: '/v2/calculator/tariff',
  cities: '/v2/location/cities',
  city: '/v2/location/cities',
  regions: '/v2/location/regions',
  countries: '/v2/location/countries',
}

// Some actions require a POST to the CDEK API even though the widget sends GET.
const ACTION_METHOD: Record<string, string> = {
  calculate: 'POST',
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, string>
  const { action, ...rest } = q

  if (!action) {
    // Health-check or initial probe from the widget — just return OK
    return {}
  }

  const cdekPath = ACTION_PATH[action]
  if (!cdekPath) {
    throw createError({ statusCode: 400, message: `Unknown CDEK action: ${action}` })
  }

  const method = ACTION_METHOD[action] ?? 'GET'
  const qs = new URLSearchParams(rest).toString()
  const queryString = qs ? `?${qs}` : ''

  try {
    // For GET actions forward params as query string; for POST actions
    // forward params as JSON body (calculate needs location/package objects).
    if (method === 'POST') {
      return await cdekRequest(cdekPath, 'POST', rest)
    }
    return await cdekRequest(cdekPath, 'GET', undefined, queryString)
  }
  catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status ?? 500
    throw createError({ statusCode: status, message: 'CDEK API error' })
  }
})
