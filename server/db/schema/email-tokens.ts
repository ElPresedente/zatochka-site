import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const emailTokenPurposes = ['verify', 'reset'] as const
export type EmailTokenPurpose = typeof emailTokenPurposes[number]

export const emailTokens = pgTable('email_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  // hex SHA-256 от «сырого» токена; сам токен живёт только в ссылке письма
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
  tokenHashIdx: index('email_tokens_token_hash_idx').on(table.tokenHash),
  userPurposeIdx: index('email_tokens_user_purpose_idx').on(table.userId, table.purpose),
}))
