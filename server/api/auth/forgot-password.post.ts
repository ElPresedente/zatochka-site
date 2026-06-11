import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { sendPasswordResetEmail } from '~/server/utils/auth-emails'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { parseEmail } from '~/server/utils/validators'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 5

function clientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}

export default defineEventHandler(async (event) => {
  const ipLimit = { key: `forgot-password:ip:${clientIp(event)}`, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много заявок. Попробуйте позже.' }
  await assertRateLimit(ipLimit)

  const body = await readBody(event)
  let email = ''
  try {
    email = parseEmail(body?.email, 'Email', { required: true })
  }
  catch {
    // Не раскрываем детали — одинаковый ответ независимо от ввода.
    await recordRateLimitHit(ipLimit)
    return { ok: true }
  }

  const emailLimit = { key: `forgot-password:email:${email}`, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много заявок. Попробуйте позже.' }
  await assertRateLimit(emailLimit)

  await recordRateLimitHit(ipLimit)
  await recordRateLimitHit(emailLimit)

  try {
    const db = useDb()
    const [user] = await db
      .select({ id: users.id, firstName: users.firstName, email: users.email })
      .from(users)
      .where(eq(users.email, email))

    // Без энумерации: всегда возвращаем ok. Письмо шлём только если аккаунт есть.
    if (user && user.email) {
      await sendPasswordResetEmail({ id: user.id, firstName: user.firstName, email: user.email })
    }
  }
  catch (e) {
    handleDbConnectionError(e)
    console.error('[auth] forgot-password failed', e)
  }

  return { ok: true }
})
