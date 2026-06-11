import { eq } from 'drizzle-orm'
import { handleDbConnectionError, useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { consumeToken } from '~/server/utils/email-tokens'

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token

  if (typeof token !== 'string' || !token) {
    return sendRedirect(event, '/confirm?status=invalid', 302)
  }

  try {
    const userId = await consumeToken(token, 'verify')
    if (!userId) {
      return sendRedirect(event, '/confirm?status=invalid', 302)
    }

    const db = useDb()
    const [user] = await db
      .select({ pendingEmail: users.pendingEmail })
      .from(users)
      .where(eq(users.id, userId))

    // Если есть ожидающий новый email (смена в профиле) — применяем его.
    // Иначе это обычное подтверждение регистрации.
    if (user?.pendingEmail) {
      try {
        await db.update(users)
          .set({ email: user.pendingEmail, emailVerified: true, pendingEmail: null })
          .where(eq(users.id, userId))
      }
      catch (e: any) {
        // Адрес мог быть занят другим аккаунтом, пока ссылка ждала перехода.
        const pgCode = e?.code ?? e?.cause?.code
        if (pgCode === '23505') {
          await db.update(users).set({ pendingEmail: null }).where(eq(users.id, userId))
          return sendRedirect(event, '/confirm?status=invalid', 302)
        }
        throw e
      }
    }
    else {
      await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, userId))
    }

    return sendRedirect(event, '/confirm?status=ok', 302)
  }
  catch (e) {
    handleDbConnectionError(e)
    return sendRedirect(event, '/confirm?status=invalid', 302)
  }
})
