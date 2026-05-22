import type { H3Event } from 'h3'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function refererOrigin(referer: string | undefined): string | null {
  if (!referer) return null
  try {
    return new URL(referer).origin
  }
  catch {
    return null
  }
}

function assertSameOrigin(event: H3Event) {
  const method = getMethod(event)
  if (!UNSAFE_METHODS.has(method)) return

  const expectedOrigin = getRequestURL(event).origin
  const origin = getHeader(event, 'origin')

  if (origin) {
    if (origin === expectedOrigin) return
    throw createError({ statusCode: 403, message: 'Неверный источник запроса' })
  }

  const fromReferer = refererOrigin(getHeader(event, 'referer'))
  if (fromReferer === expectedOrigin) return

  throw createError({ statusCode: 403, message: 'Источник запроса не подтверждён' })
}

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  assertSameOrigin(event)
})
