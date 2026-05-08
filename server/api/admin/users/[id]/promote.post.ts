import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { admins, users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const userId = parseRouteId(getRouterParam(event, 'id'), 'пользователя')

  const db = useDb()
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  await db.insert(admins).values({ userId }).onConflictDoNothing()
  return { ok: true }
})
