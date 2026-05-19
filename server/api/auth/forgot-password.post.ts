import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { notifyPasswordResetRequest } from '~/server/utils/order-notifications'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { normalizePhone } from '~/server/utils/validators'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 3

function getClientKey(event: H3Event) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `forgot-password:${ip}`
}

export default defineEventHandler(async (event) => {
  const key = getClientKey(event)
  const rateLimit = { key, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много заявок. Попробуйте позже.' }

  await assertRateLimit(rateLimit)

  const body = await readBody(event)
  const phone = normalizePhone(String(body?.phone ?? '').trim())

  if (!phone) {
    throw createError({ statusCode: 400, message: 'Некорректный номер телефона' })
  }

  await recordRateLimitHit(rateLimit)

  const db = useDb()

  try {
    const [user] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone })
      .from(users)
      .where(eq(users.phone, phone))

    // Always return ok to prevent phone enumeration
    if (!user) return { ok: true }

    await notifyPasswordResetRequest({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    })
  } catch (e) {
    handleDbConnectionError(e)
    throw e
  }

  return { ok: true }
})
