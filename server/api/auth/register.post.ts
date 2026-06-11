import bcrypt from 'bcryptjs'
import type { H3Event } from 'h3'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { sendVerificationEmail } from '~/server/utils/auth-emails'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { normalizePhone, parseEmail, parseTrimmedString } from '~/server/utils/validators'

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
  const email = parseEmail(body?.email, 'Email', { required: true })

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
      email,
      // emailVerified остаётся false (default) — вход заблокирован до подтверждения почты.
      passwordHash,
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
    }).returning()

    await recordRateLimitHit(rateLimit)

    // Не логиним пользователя сразу: вход открывается только после подтверждения email.
    // Ошибку отправки письма не пробрасываем — аккаунт уже создан, можно запросить письмо повторно.
    try {
      await sendVerificationEmail({ id: user.id, firstName: user.firstName, email })
    }
    catch (mailErr) {
      console.error('[auth] verification email failed for user', user.id, mailErr)
    }

    return { emailVerificationRequired: true, email }
  } catch (e: any) {
    handleDbConnectionError(e)
    const pgCode = e?.code ?? e?.cause?.code
    if (pgCode === '23505') {
      await recordRateLimitHit(rateLimit)
      const detail: string = e?.detail ?? e?.cause?.detail ?? ''
      if (detail.includes('email')) {
        throw createError({ statusCode: 409, message: 'Аккаунт с таким email уже существует. Войдите или воспользуйтесь восстановлением пароля.' })
      }
      throw createError({ statusCode: 409, message: 'Аккаунт с таким номером телефона уже создан. Войдите или воспользуйтесь восстановлением пароля.' })
    }
    throw e
  }
})
