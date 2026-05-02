import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  lastName: text('last_name').notNull(),
  firstName: text('first_name').notNull(),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  consentGivenAt: timestamp('consent_given_at'),
  consentVersion: text('consent_version'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const admins = pgTable('admins', {
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .primaryKey(),
})
