import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'
import { assertRateLimit, clearRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { normalizePhone } from '~/server/utils/validators'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function getClientKey(event: H3Event, login: unknown) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `login:${ip}:${String(login ?? '').trim()}`
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const login: string = String(body?.login ?? body?.phone ?? '').trim()
  const password: string = body?.password ?? ''

  const loginKey = getClientKey(event, login)
  const rateLimit = { key: loginKey, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много попыток входа. Попробуйте позже.' }

  await assertRateLimit(rateLimit)

  if (!login || !password) {
    throw createError({ statusCode: 400, message: 'Телефон / email и пароль обязательны' })
  }

  const db = useDb()
  const isEmail = EMAIL_RE.test(login)

  let whereClause
  if (isEmail) {
    whereClause = eq(users.email, login.toLowerCase())
  } else {
    const normalizedPhone = normalizePhone(login)
    if (!normalizedPhone) {
      await recordRateLimitHit(rateLimit)
      throw createError({ statusCode: 401, message: 'Неверный телефон / email или пароль' })
    }
    whereClause = eq(users.phone, normalizedPhone)
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        email: users.email,
        emailVerified: users.emailVerified,
        sessionVersion: users.sessionVersion,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(whereClause)

    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      await recordRateLimitHit(rateLimit)
      throw createError({ statusCode: 401, message: 'Неверный телефон / email или пароль' })
    }

    await clearRateLimit(loginKey)

    // Вход заблокирован, пока email не подтверждён (для аккаунтов с привязанной почтой).
    if (user.email && !user.emailVerified) {
      throw createError({
        statusCode: 403,
        message: 'Подтвердите email, чтобы войти. Мы отправили ссылку на вашу почту.',
        data: { code: 'email_not_verified', email: user.email },
      })
    }

    const session = await getAuthSession(event)
    await session.update({ userId: user.id, sv: user.sessionVersion })

    const [admin] = await db.select({ userId: admins.userId }).from(admins).where(eq(admins.userId, user.id))

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isAdmin: !!admin,
    }
  } catch (e) {
    handleDbConnectionError(e)
    throw e
  }
})
