import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

function getClientKey(event: H3Event, phone: unknown) {
  return `${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${String(phone ?? '').trim()}`
}

function assertLoginAllowed(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + WINDOW_MS })
    return
  }

  if (current.count >= MAX_ATTEMPTS) {
    throw createError({ statusCode: 429, message: 'Слишком много попыток входа. Попробуйте позже.' })
  }
}

function recordFailedLogin(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  current.count += 1
}

export default defineEventHandler(async (event) => {
  const { phone, password } = await readBody(event)
  const loginKey = getClientKey(event, phone)
  assertLoginAllowed(loginKey)

  if (!phone || !password) {
    throw createError({ statusCode: 400, message: 'Телефон и пароль обязательны' })
  }

  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.phone, phone.trim()))

  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    recordFailedLogin(loginKey)
    throw createError({ statusCode: 401, message: 'Неверный телефон или пароль' })
  }

  attempts.delete(loginKey)

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
