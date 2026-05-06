import { desc, eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders, orderItems } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const db = useDb()

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.data.userId))
    .orderBy(desc(orders.createdAt))

  if (!userOrders.length) return []

  const ids = userOrders.map(o => o.id)
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, ids))

  const byOrderId = new Map<number, typeof items>()
  for (const item of items) {
    const arr = byOrderId.get(item.orderId) ?? []
    arr.push(item)
    byOrderId.set(item.orderId, arr)
  }

  return userOrders.map(order => ({ ...order, items: byOrderId.get(order.id) ?? [] }))
})
