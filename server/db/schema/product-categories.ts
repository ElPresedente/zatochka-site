import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core'

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
})
