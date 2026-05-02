import { count, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { admins } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'))
  if (!userId) throw createError({ statusCode: 400, message: 'Неверный id' })

  const session = await getAuthSession(event)
  if (session.data.userId === userId) {
    throw createError({ statusCode: 400, message: 'Нельзя снять права администратора с самого себя' })
  }

  const db = useDb()
  const [{ total }] = await db.select({ total: count() }).from(admins)
  if (total <= 1) {
    throw createError({ statusCode: 400, message: 'Нельзя снять права у последнего администратора' })
  }

  await db.delete(admins).where(eq(admins.userId, userId))
  return { ok: true }
})
