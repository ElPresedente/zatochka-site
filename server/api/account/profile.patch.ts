import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { parseTrimmedString, parseEmail } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const body = await readBody(event)
  const firstName = parseTrimmedString(body?.firstName, 'Имя', { required: true, max: 100 })
  const lastName = parseTrimmedString(body?.lastName, 'Фамилия', { required: true, max: 100 })
  const email = parseEmail(body?.email, 'Email')

  const db = useDb()
  const [updated] = await db
    .update(users)
    .set({ firstName, lastName, email: email || null })
    .where(eq(users.id, session.data.userId))
    .returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone, email: users.email })

  if (!updated) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  return updated
})
