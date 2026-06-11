import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { sendEmailChangeVerification } from '~/server/utils/auth-emails'
import { parseTrimmedString, parseEmail } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }
  const userId = session.data.userId

  const body = await readBody(event)
  const firstName = parseTrimmedString(body?.firstName, 'Имя', { required: true, max: 100 })
  const lastName = parseTrimmedString(body?.lastName, 'Фамилия', { required: true, max: 100 })
  const newEmail = parseEmail(body?.email, 'Email') // '' если очищают

  const db = useDb()

  const [current] = await db
    .select({ email: users.email, firstName: users.firstName })
    .from(users)
    .where(eq(users.id, userId))
  if (!current) throw createError({ statusCode: 404, message: 'Пользователь не найден' })

  const currentEmail = current.email ?? ''

  // Имя/фамилию обновляем всегда. С email — отдельная логика.
  const update: Partial<typeof users.$inferInsert> = { firstName, lastName }
  let emailChangePending = false

  if (newEmail === currentEmail) {
    // Email не меняется — отменяем возможный незавершённый pending.
    update.pendingEmail = null
  }
  else if (newEmail === '') {
    // Удаление email — без подтверждения (отказ от привязки почты).
    update.email = null
    update.emailVerified = false
    update.pendingEmail = null
  }
  else {
    // Смена на новый адрес — НЕ применяем сразу, требуем подтверждения по ссылке.
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, newEmail), ne(users.id, userId)))
    if (taken) {
      throw createError({ statusCode: 409, message: 'Этот email уже используется другим аккаунтом' })
    }
    update.pendingEmail = newEmail
    emailChangePending = true
  }

  const [updated] = await db
    .update(users)
    .set(update)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      email: users.email,
      pendingEmail: users.pendingEmail,
    })

  if (emailChangePending) {
    try {
      await sendEmailChangeVerification({ id: userId, firstName: updated.firstName, newEmail })
    }
    catch (mailErr) {
      console.error('[auth] email-change verification failed for user', userId, mailErr)
    }
  }

  return { ...updated, emailChangePending }
})
