import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { admins } from '~/server/db/schema'

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

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/admin/')) return

  assertSameOrigin(event)

  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()
  const [admin] = await db.select().from(admins).where(eq(admins.userId, session.data.userId))
  if (!admin) {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }
})
