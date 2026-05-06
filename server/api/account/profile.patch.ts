import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const body = await readBody(event)
  const firstName = (body?.firstName ?? '').trim()
  const lastName = (body?.lastName ?? '').trim()

  if (!firstName) throw createError({ statusCode: 400, message: 'Имя обязательно' })
  if (!lastName) throw createError({ statusCode: 400, message: 'Фамилия обязательна' })

  const db = useDb()
  const [updated] = await db
    .update(users)
    .set({ firstName, lastName })
    .where(eq(users.id, session.data.userId))
    .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })

  if (!updated) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  return updated
})
