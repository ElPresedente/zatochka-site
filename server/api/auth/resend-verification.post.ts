import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { sendVerificationEmail } from '~/server/utils/auth-emails'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { parseEmail } from '~/server/utils/validators'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 5

function clientIp(event: H3Event) {
  return getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
}

export default defineEventHandler(async (event) => {
  const ipLimit = { key: `resend-verify:ip:${clientIp(event)}`, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много запросов. Попробуйте позже.' }
  await assertRateLimit(ipLimit)

  const body = await readBody(event)
  let email = ''
  try {
    email = parseEmail(body?.email, 'Email', { required: true })
  }
  catch {
    // Не раскрываем детали валидации — отвечаем одинаково.
    await recordRateLimitHit(ipLimit)
    return { ok: true }
  }

  const emailLimit = { key: `resend-verify:email:${email}`, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много запросов. Попробуйте позже.' }
  await assertRateLimit(emailLimit)

  await recordRateLimitHit(ipLimit)
  await recordRateLimitHit(emailLimit)

  try {
    const db = useDb()
    const [user] = await db
      .select({ id: users.id, firstName: users.firstName, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))

    // Без энумерации: отвечаем ok независимо от наличия/состояния аккаунта.
    if (user && user.email && !user.emailVerified) {
      await sendVerificationEmail({ id: user.id, firstName: user.firstName, email: user.email })
    }
  }
  catch (e) {
    handleDbConnectionError(e)
    // Тихо проглатываем — ответ всё равно одинаковый.
    console.error('[auth] resend-verification failed', e)
  }

  return { ok: true }
})
