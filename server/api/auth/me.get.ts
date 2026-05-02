import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.id, session.data.userId))
  if (!user) throw createError({ statusCode: 401, message: 'Пользователь не найден' })

  const [admin] = await db.select().from(admins).where(eq(admins.userId, user.id))

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isAdmin: !!admin,
  }
})
