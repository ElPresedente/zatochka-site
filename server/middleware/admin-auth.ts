import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { admins } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/admin/')) return

  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()
  const [admin] = await db.select({ userId: admins.userId })
    .from(admins)
    .where(eq(admins.userId, session.data.userId))

  if (!admin) {
    throw createError({ statusCode: 403, message: 'Доступ запрещен' })
  }

  event.context.userId = admin.userId
})
