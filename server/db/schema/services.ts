import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const serviceCategories = pgTable('service_categories', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const serviceItems = pgTable('service_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => serviceCategories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  price: text('price').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const serviceNotes = pgTable('service_notes', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  items: many(serviceItems),
}))

export const serviceItemsRelations = relations(serviceItems, ({ one }) => ({
  category: one(serviceCategories, {
    fields: [serviceItems.categoryId],
    references: [serviceCategories.id],
  }),
}))
