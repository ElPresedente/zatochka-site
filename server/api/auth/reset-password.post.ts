import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { consumeToken } from '~/server/utils/email-tokens'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = body?.token
  const password = body?.password

  if (typeof token !== 'string' || !token) {
    throw createError({ statusCode: 400, message: 'Некорректная ссылка восстановления' })
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw createError({ statusCode: 400, message: 'Пароль должен содержать не менее 8 символов' })
  }
  if (password.length > 128) {
    throw createError({ statusCode: 400, message: 'Пароль слишком длинный' })
  }

  try {
    const userId = await consumeToken(token, 'reset')
    if (!userId) {
      throw createError({ statusCode: 400, message: 'Ссылка восстановления недействительна или истекла' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const db = useDb()

    // Сброс пароля инвалидирует все ранее выданные сессии (инкремент session_version,
    // см. server/middleware/0.session-version.ts). Переход по письму подтверждает
    // владение почтой — заодно помечаем email подтверждённым.
    await db.update(users)
      .set({
        passwordHash,
        emailVerified: true,
        sessionVersion: sql`${users.sessionVersion} + 1`,
      })
      .where(eq(users.id, userId))

    return { ok: true }
  }
  catch (e) {
    handleDbConnectionError(e)
    throw e
  }
})
