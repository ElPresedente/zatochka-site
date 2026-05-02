import bcrypt from 'bcryptjs'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'

const CONSENT_VERSION = '1.0'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { lastName, firstName, phone, password, consentGiven } = body

  if (!lastName?.trim() || !firstName?.trim() || !phone?.trim() || !password) {
    throw createError({ statusCode: 400, message: 'Заполните все обязательные поля' })
  }
  if (consentGiven !== true) {
    throw createError({ statusCode: 400, message: 'Необходимо согласие на обработку персональных данных' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'Пароль должен содержать не менее 6 символов' })
  }

  const db = useDb()
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const [user] = await db.insert(users).values({
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      phone: phone.trim(),
      passwordHash,
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
    }).returning()

    const session = await getAuthSession(event)
    await session.update({ userId: user.id })

    return { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone }
  } catch (e: any) {
    if (e?.code === '23505') {
      throw createError({ statusCode: 409, message: 'Пользователь с таким телефоном уже зарегистрирован' })
    }
    throw e
  }
})
