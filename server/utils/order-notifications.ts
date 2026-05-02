import type { OrderStatus } from '~/server/db/schema'

export interface OrderNotificationPayload {
  id: number
  customerName: string
  customerPhone: string
  totalAmount: number
  status: OrderStatus
}

export async function notifyOrderCreated(order: OrderNotificationPayload) {
  // TODO: replace with Telegram notification integration.
  console.info('[order-created]', {
    id: order.id,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    totalAmount: order.totalAmount,
    status: order.status,
  })
}
