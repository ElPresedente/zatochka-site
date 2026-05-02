import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderItems, orders } from '~/server/db/schema'

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

  const items = await db.select().from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id))

  return { ...order, items }
})
