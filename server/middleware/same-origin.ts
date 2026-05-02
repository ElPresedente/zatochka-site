import type { H3Event } from 'h3'

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function assertSameOrigin(event: H3Event) {
  const method = getMethod(event)
  if (!UNSAFE_METHODS.has(method)) return

  const origin = getHeader(event, 'origin')
  if (!origin) return

  const requestUrl = getRequestURL(event)
  if (origin !== requestUrl.origin) {
    throw createError({ statusCode: 403, message: 'Неверный источник запроса' })
  }
}

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/auth/') && !event.path.startsWith('/api/orders')) return

  assertSameOrigin(event)
})
