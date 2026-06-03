import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core'
import { productCategories } from './product-categories'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull()
    .references(() => productCategories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  stock: integer('stock').notNull().default(0),
  description: text('description').notNull().default(''),
  photos: text('photos').notNull().default('[]'),
  specs: text('specs').notNull().default('[]'),
  services: text('services').notNull().default('[]'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  coverPosition: text('cover_position').notNull().default('center center'),
  weightG: integer('weight_g').notNull().default(1),
  lengthCm: integer('length_cm').notNull().default(1),
  widthCm: integer('width_cm').notNull().default(1),
  heightCm: integer('height_cm').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
