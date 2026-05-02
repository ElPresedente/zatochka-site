import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'

export const workers = pgTable('workers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  photo: text('photo').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})
