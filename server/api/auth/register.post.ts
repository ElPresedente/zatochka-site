import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { normalizePhone, parseTrimmedString } from '~/server/utils/validators'

const CONSENT_VERSION = '1.0'
const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 5

function getClientKey(event: H3Event) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `register:${ip}`
}

export default defineEventHandler(async (event) => {
  const registerKey = getClientKey(event)
  const rateLimit = { key: registerKey, windowMs: WINDOW_MS, max: MAX_ATTEMPTS, message: 'Слишком много попыток регистрации. Попробуйте позже.' }

  await assertRateLimit(rateLimit)

  const body = await readBody(event)
  const { consentGiven, password } = body

  const lastName = parseTrimmedString(body?.lastName, 'Фамилия', { required: true, max: 100 })
  const firstName = parseTrimmedString(body?.firstName, 'Имя', { required: true, max: 100 })
  const rawPhone = parseTrimmedString(body?.phone, 'Телефон', { required: true, max: 30 })
  const phone = normalizePhone(rawPhone)
  if (!phone) {
    throw createError({ statusCode: 400, message: 'Некорректный номер телефона. Введите российский номер: +7XXXXXXXXXX или 8XXXXXXXXXX' })
  }

  if (consentGiven !== true) {
    throw createError({ statusCode: 400, message: 'Необходимо согласие на обработку персональных данных' })
  }
  if (typeof password !== 'string' || password.length < 6) {
    throw createError({ statusCode: 400, message: 'Пароль должен содержать не менее 6 символов' })
  }
  if (password.length > 128) {
    throw createError({ statusCode: 400, message: 'Пароль слишком длинный' })
  }

  const db = useDb()
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const [user] = await db.insert(users).values({
      lastName,
      firstName,
      phone,
      passwordHash,
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
    }).returning()

    const session = await getAuthSession(event)
    await session.update({ userId: user.id })

    await recordRateLimitHit(rateLimit)

    return { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone }
  } catch (e: any) {
    handleDbConnectionError(e)
    if (e?.code === '23505') {
      await recordRateLimitHit(rateLimit)
      throw createError({ statusCode: 409, message: 'Пользователь с таким телефоном уже зарегистрирован' })
    }
    throw e
  }
})
