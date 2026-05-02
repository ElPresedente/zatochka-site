import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderItems, orders, orderStatuses, products, type OrderStatus } from '~/server/db/schema'

const FINAL_STATUSES = new Set<OrderStatus>(['cancelled', 'completed'])

function parseStatus(input: unknown): OrderStatus {
  if (typeof input !== 'string' || !orderStatuses.includes(input as OrderStatus)) {
    throw createError({ statusCode: 400, message: 'Некорректный статус заказа' })
  }
  return input as OrderStatus
}

function assertTransition(current: OrderStatus, next: OrderStatus) {
  if (current === next) return
  if (FINAL_STATUSES.has(current)) {
    throw createError({ statusCode: 409, message: 'Финальный статус заказа нельзя изменить' })
  }
  if (current === 'created' && (next === 'accepted' || next === 'cancelled')) return
  if (current === 'accepted' && (next === 'in_progress' || next === 'cancelled')) return
  if (current === 'in_progress' && (next === 'ready' || next === 'cancelled')) return
  if (current === 'ready' && (next === 'completed' || next === 'cancelled')) return

  throw createError({ statusCode: 409, message: 'Недопустимый переход статуса заказа' })
}

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID заказа' })
  }

  const body = await readBody(event)
  const nextStatus = parseStatus(body?.status)
  const db = useDb()

  const updatedOrder = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id))
    if (!order) {
      throw createError({ statusCode: 404, message: 'Заказ не найден' })
    }

    const currentStatus = order.status as OrderStatus
    assertTransition(currentStatus, nextStatus)

    if (currentStatus === nextStatus) return order

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))

    if (currentStatus === 'created' && nextStatus === 'accepted') {
      for (const item of items) {
        if (!item.productId) continue

        const [product] = await tx.select({ stock: products.stock })
          .from(products)
          .where(eq(products.id, item.productId))
        const stockDeducted = Math.min(product?.stock ?? 0, item.quantity)

        await tx.update(products)
          .set({ stock: sql`greatest(${products.stock} - ${item.quantity}, 0)` })
          .where(eq(products.id, item.productId))

        await tx.update(orderItems)
          .set({ stockDeducted })
          .where(eq(orderItems.id, item.id))
      }
    }

    if (nextStatus === 'cancelled' && ['accepted', 'in_progress', 'ready'].includes(currentStatus)) {
      for (const item of items) {
        if (!item.productId) continue

        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.stockDeducted}` })
          .where(eq(products.id, item.productId))
      }
    }

    const [updated] = await tx.update(orders)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

    return updated
  })

  return updatedOrder
})
