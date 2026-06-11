import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  emailVerified: boolean('email_verified').notNull().default(false),
  // Новый email при смене в профиле — применяется к `email` только после подтверждения по ссылке.
  pendingEmail: text('pending_email'),
  passwordHash: text('password_hash').notNull(),
  // Инкрементируется при сбросе пароля — инвалидирует ранее выданные сессии (см. server/middleware/session-version.ts)
  sessionVersion: integer('session_version').notNull().default(0),
  consentGivenAt: timestamp('consent_given_at'),
  consentVersion: text('consent_version'),
  deletionRequestedAt: timestamp('deletion_requested_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const admins = pgTable('admins', {
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
})
