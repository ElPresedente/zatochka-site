import { cdekRequest } from '~/server/utils/cdek'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { url, method, body: requestBody, params } = body ?? {}

  if (!url || typeof url !== 'string' || !url.startsWith('/v2/')) {
    throw createError({ statusCode: 400, message: 'Invalid CDEK request' })
  }

  // params can arrive as a query string "?key=val" or as a plain object {key: val}
  let queryString = ''
  if (params) {
    if (typeof params === 'string') {
      queryString = params.startsWith('?') ? params : `?${params}`
    }
    else if (typeof params === 'object') {
      const qs = new URLSearchParams(params as Record<string, string>).toString()
      if (qs) queryString = `?${qs}`
    }
  }

  try {
    return await cdekRequest(url, method ?? 'GET', requestBody, queryString)
  }
  catch (err: any) {
    const status = err?.statusCode ?? err?.response?.status ?? 500
    throw createError({ statusCode: status, message: 'CDEK API error' })
  }
})
