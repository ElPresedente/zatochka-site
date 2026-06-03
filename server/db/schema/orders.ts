import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'
import { products } from './products'
import { users } from './users'

export const orderStatuses = ['created', 'cancelled', 'accepted', 'in_progress', 'ready', 'completed'] as const
export type OrderStatus = typeof orderStatuses[number]

export const paymentMethods = ['cash', 'online_card'] as const
export type PaymentMethod = typeof paymentMethods[number]

export const paymentStatuses = ['unpaid', 'paid', 'failed', 'refunded', 'waiting_for_capture'] as const
export type PaymentStatus = typeof paymentStatuses[number]

export const deliveryMethods = ['pickup', 'delivery'] as const
export type DeliveryMethod = typeof deliveryMethods[number]

export const deliveryScopes = ['orel', 'russia'] as const
export type DeliveryScope = typeof deliveryScopes[number]

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  customerFirstName: text('customer_first_name').notNull(),
  customerLastName: text('customer_last_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull().default(''),
  userComment: text('user_comment').notNull().default(''),
  sellerComment: text('seller_comment').notNull().default(''),
  status: text('status').notNull().default('created'),
  totalAmount: integer('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  yookassaPaymentId: text('yookassa_payment_id'),
  paidAt: timestamp('paid_at'),
  extraPaymentId: text('extra_payment_id'),
  extraPaymentAmount: integer('extra_payment_amount'),
  extraPaymentStatus: text('extra_payment_status').notNull().default('none'),
  // Delivery fields
  deliveryMethod: text('delivery_method').notNull().default('pickup'),
  deliveryScope: text('delivery_scope'),
  deliveryAddress: text('delivery_address'),
  deliveryCoords: text('delivery_coords'),
  deliveryCost: integer('delivery_cost').notNull().default(0),
  cdekPvzCode: text('cdek_pvz_code'),
  cdekPvzAddress: text('cdek_pvz_address'),
  cdekPvzCity: text('cdek_pvz_city'),
  cdekTariffCode: integer('cdek_tariff_code'),
  cdekDeliveryDaysMin: integer('cdek_delivery_days_min'),
  cdekDeliveryDaysMax: integer('cdek_delivery_days_max'),
  cdekOrderUuid: text('cdek_order_uuid'),
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
  stockDeducted: integer('stock_deducted').notNull().default(0),
  services: text('services').notNull().default('[]'),
}, table => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
  productIdIdx: index('order_items_product_id_idx').on(table.productId),
}))

export const orderHistory = pgTable('order_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  adminId: integer('admin_id')
    .references(() => users.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => ({
  orderIdIdx: index('order_history_order_id_idx').on(table.orderId),
}))
