import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'
import { assertRateLimit, clearRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { normalizePhone } from '~/server/utils/validators'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function getClientKey(event: H3Event, phone: unknown) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const normalizedPhone = String(phone ?? '').trim()
  return `login:${ip}:${normalizedPhone}`
}

export default defineEventHandler(async (event) => {
  const { phone, password } = await readBody(event)
  const loginKey = getClientKey(event, phone)
  const rateLimit = { key: loginKey, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много попыток входа. Попробуйте позже.' }

  await assertRateLimit(rateLimit)

  if (!phone || !password) {
    throw createError({ statusCode: 400, message: 'Телефон и пароль обязательны' })
  }

  const db = useDb()
  const normalizedPhone = normalizePhone(String(phone ?? '').trim())
  if (!normalizedPhone) {
    await recordRateLimitHit(rateLimit)
    throw createError({ statusCode: 401, message: 'Неверный телефон или пароль' })
  }
  const [user] = await db.select().from(users).where(eq(users.phone, normalizedPhone))

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    await recordRateLimitHit(rateLimit)
    throw createError({ statusCode: 401, message: 'Неверный телефон или пароль' })
  }

  await clearRateLimit(loginKey)

  const session = await getAuthSession(event)
  await session.update({ userId: user.id })

  const [admin] = await db.select().from(admins).where(eq(admins.userId, user.id))

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isAdmin: !!admin,
  }
})
