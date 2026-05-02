import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'
import { users } from './users'

export const orderStatuses = ['created', 'cancelled', 'accepted', 'in_progress', 'ready', 'completed'] as const
export type OrderStatus = typeof orderStatuses[number]

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  customerFirstName: text('customer_first_name').notNull(),
  customerLastName: text('customer_last_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  userComment: text('user_comment').notNull().default(''),
  sellerComment: text('seller_comment').notNull().default(''),
  status: text('status').notNull().default('created'),
  totalAmount: integer('total_amount').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, table => ({
  statusCheck: check('orders_status_check', sql`${table.status} in ('created', 'cancelled', 'accepted', 'in_progress', 'ready', 'completed')`),
  statusIdx: index('orders_status_idx').on(table.status),
  createdAtIdx: index('orders_created_at_idx').on(table.createdAt),
  userIdIdx: index('orders_user_id_idx').on(table.userId),
}))

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id')
    .references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productPhoto: text('product_photo').notNull().default(''),
  unitPrice: integer('unit_price').notNull(),
  quantity: integer('quantity').notNull(),
  totalPrice: integer('total_price').notNull(),
}, table => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
  productIdIdx: index('order_items_product_id_idx').on(table.productId),
}))
