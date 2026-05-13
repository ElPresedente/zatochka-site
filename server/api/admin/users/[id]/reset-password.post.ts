import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

// Excludes visually ambiguous chars: 0/O, 1/l/I
const CHARSET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generatePassword(): string {
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return result
}

export default defineEventHandler(async (event) => {
  const userId = parseRouteId(event, 'id')

  const db = useDb()
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId))
  if (!user) {
    throw createError({ statusCode: 404, message: 'Пользователь не найден' })
  }

  const newPassword = generatePassword()
  const passwordHash = await bcrypt.hash(newPassword, 12)

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId))

  return { password: newPassword }
})
