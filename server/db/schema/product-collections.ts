import { pgTable, serial, text, integer, boolean, primaryKey } from 'drizzle-orm/pg-core'
import { products } from './products'

export const productCollections = pgTable('product_collections', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  active: boolean('active').notNull().default(true),
})

export const productCollectionItems = pgTable('product_collection_items', {
  collectionId: integer('collection_id').notNull()
    .references(() => productCollections.id, { onDelete: 'cascade' }),
  productId: integer('product_id').notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.collectionId, table.productId] }),
}))
