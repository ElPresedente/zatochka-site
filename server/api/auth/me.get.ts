import { eq } from 'drizzle-orm'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()

  try {
    const [row] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        adminUserId: admins.userId,
      })
      .from(users)
      .leftJoin(admins, eq(admins.userId, users.id))
      .where(eq(users.id, session.data.userId))

    if (!row) throw createError({ statusCode: 401, message: 'Пользователь не найден' })

    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      isAdmin: row.adminUserId !== null,
    }
  } catch (e) {
    handleDbConnectionError(e)
    throw e
  }
})
