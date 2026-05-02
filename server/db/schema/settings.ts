import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Key-value store for site-wide settings (contacts, hours, etc.)
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
