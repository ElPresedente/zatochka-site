import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  description: text('description').notNull().default(''),
  photos: text('photos').notNull().default('[]'),
  specs: text('specs').notNull().default('[]'),
  services: text('services').notNull().default('[]'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
