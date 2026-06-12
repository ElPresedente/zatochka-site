import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { generatePassword } from '~/server/utils/password'
import { sendNewPasswordEmail } from '~/server/utils/auth-emails'
import { notifyPasswordReset } from '~/server/utils/order-notifications'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, session.data.userId))

  if (!user) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  if (!user.email) {
    throw createError({
      statusCode: 400,
      message: 'К аккаунту не привязана почта. Добавьте email в профиле, чтобы сбросить пароль.',
    })
  }

  const newPassword = generatePassword()
  const passwordHash = await bcrypt.hash(newPassword, 12)
  // Сброс пароля инвалидирует все сессии (включая текущую) — пользователя
  // выкинет из аккаунта, дальше вход только с новым паролем.
  await db.update(users)
    .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, user.id))

  // Письмо с паролем — критично: если не доставлено, пароль клиент не узнает.
  try {
    await sendNewPasswordEmail({ firstName: user.firstName, email: user.email }, newPassword)
  } catch (err) {
    console.error('[mail] new-password email failed for user', user.id, err)
    throw createError({ statusCode: 502, message: 'Не удалось отправить письмо. Попробуйте позже.' })
  }

  // Уведомление администратора — best-effort, не должно ломать поток.
  await notifyPasswordReset({
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  })

  return { ok: true }
})
