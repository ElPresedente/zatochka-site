import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const userId = parseRouteId(getRouterParam(event, 'id'), 'пользователя')

  const db = useDb()
  const [deleted] = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
  if (!deleted) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  return { ok: true }
})
