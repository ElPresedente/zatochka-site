import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const body = await readBody(event)
  const currentPassword = parseTrimmedString(body?.currentPassword, 'Текущий пароль', { required: true, max: 200 })
  const newPassword = parseTrimmedString(body?.newPassword, 'Новый пароль', { required: true, max: 200 })

  if (newPassword.length < 6) {
    throw createError({ statusCode: 400, message: 'Новый пароль должен быть не короче 6 символов' })
  }

  const db = useDb()
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.data.userId))

  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw createError({ statusCode: 400, message: 'Неверный текущий пароль' })

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

  return { ok: true }
})
