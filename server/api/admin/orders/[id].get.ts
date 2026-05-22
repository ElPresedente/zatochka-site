import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders } from '~/server/db/schema'
import { parseOrderItemServices } from '~/server/utils/json-shapes'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID заказа' })
  }

  const db = useDb()
  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }

  const [items, history] = await Promise.all([
    db.select().from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.id)),
    db.select().from(orderHistory)
      .where(eq(orderHistory.orderId, id))
      .orderBy(asc(orderHistory.createdAt)),
  ])

  return {
    ...order,
    items: items.map(item => ({
      ...item,
      services: parseOrderItemServices(item.services),
    })),
    history,
  }
})
