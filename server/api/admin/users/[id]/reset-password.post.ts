import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'
import { generatePassword } from '~/server/utils/password'
import { sendNewPasswordEmail } from '~/server/utils/auth-emails'

export default defineEventHandler(async (event) => {
  const userId = parseRouteId(getRouterParam(event, 'id'), 'пользователя')

  const db = useDb()
  const [user] = await db
    .select({ id: users.id, firstName: users.firstName, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
  if (!user) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  }

  const newPassword = generatePassword()
  const passwordHash = await bcrypt.hash(newPassword, 12)

  // Сброс пароля инвалидирует все ранее выданные сессии пользователя.
  await db.update(users)
    .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId))

  // Отправляем пароль на почту, если она привязана. Пароль всё равно возвращаем
  // админу, чтобы передать вручную (например, аккаунт без email).
  let emailed = false
  if (user.email) {
    try {
      await sendNewPasswordEmail({ firstName: user.firstName, email: user.email }, newPassword)
      emailed = true
    } catch (err) {
      console.error('[mail] new-password email failed for user', user.id, err)
    }
  }

  return { password: newPassword, emailed }
})
