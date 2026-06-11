import { randomBytes, createHash } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { emailTokens, type EmailTokenPurpose } from '~/server/db/schema'

const TTL_MS: Record<EmailTokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Выдать одноразовый токен. Возвращает «сырой» url-safe токен — он попадает
 * только в ссылку письма; в БД хранится исключительно его SHA-256-хеш.
 * Предыдущие неиспользованные токены того же назначения гасятся.
 */
export async function issueToken(userId: number, purpose: EmailTokenPurpose): Promise<string> {
  const db = useDb()
  const rawToken = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + TTL_MS[purpose])

  // Погасить ранее выданные активные токены того же назначения (один живой токен на цель)
  await db.update(emailTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(emailTokens.userId, userId),
      eq(emailTokens.purpose, purpose),
      isNull(emailTokens.consumedAt),
    ))

  await db.insert(emailTokens).values({ userId, purpose, tokenHash, expiresAt })

  return rawToken
}

/**
 * Атомарно погасить токен. Возвращает userId при успехе либо null, если токен
 * не найден / просрочен / уже использован / не того назначения.
 * Гонка двойного погашения исключена guard'ом `consumed_at IS NULL` в UPDATE.
 */
export async function consumeToken(rawToken: string, purpose: EmailTokenPurpose): Promise<number | null> {
  if (typeof rawToken !== 'string' || rawToken.length < 16) return null

  const db = useDb()
  const tokenHash = hashToken(rawToken)

  const [consumed] = await db.update(emailTokens)
    .set({ consumedAt: new Date() })
    .where(and(
      eq(emailTokens.tokenHash, tokenHash),
      eq(emailTokens.purpose, purpose),
      isNull(emailTokens.consumedAt),
      sql`${emailTokens.expiresAt} > now()`,
    ))
    .returning({ userId: emailTokens.userId })

  return consumed?.userId ?? null
}
