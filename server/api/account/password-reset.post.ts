import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { notifyPasswordResetRequest } from '~/server/utils/order-notifications'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()
  const [user] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
    .from(users)
    .where(eq(users.id, session.data.userId))

  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  await notifyPasswordResetRequest({
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  })

  return { ok: true }
})
