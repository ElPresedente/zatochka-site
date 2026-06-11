import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'

/**
 * Инвалидация сессий при сбросе пароля.
 *
 * Кука `sid` — stateless-подписанная, серверной таблицы сессий нет. При сбросе
 * пароля инкрементируется `users.session_version`, а версия кладётся в сессию
 * при входе (`sv`). Здесь сверяем `sv` из сессии с актуальной версией в БД и при
 * расхождении (после сброса) или удалении пользователя отклоняем запрос (401).
 *
 * Важно: `session.clear()` в middleware НЕ помогает — h3 сбрасывает кэш сессии,
 * и route-хендлер заново распечатывает исходную куку из запроса. Поэтому именно
 * бросаем 401.
 *
 * Проверяем только защищённые API-поверхности (где stale-сессия = риск) и только
 * при наличии `userId` — чтобы не нагружать БД на публичных и анонимных запросах.
 * Запускается ПЕРВЫМ среди middleware (префикс `0.`), до `admin-auth`.
 */
const PROTECTED_PREFIXES = ['/api/account', '/api/admin', '/api/orders']

function isProtectedPath(path: string): boolean {
  if (path === '/api/auth/me') return true
  return PROTECTED_PREFIXES.some(prefix => path.startsWith(prefix))
}

export default defineEventHandler(async (event) => {
  if (!isProtectedPath(event.path)) return

  const session = await getAuthSession(event)
  const userId = session.data.userId
  if (!userId) return

  const db = useDb()
  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))

  // Старые сессии без `sv` считаем версией 0 (обратная совместимость на момент выката).
  const sessionVersion = session.data.sv ?? 0
  if (!row || sessionVersion !== row.sessionVersion) {
    throw createError({ statusCode: 401, message: 'Сессия недействительна. Войдите снова.' })
  }
})
