import { asc, desc, eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders } from '~/server/db/schema'
import { parseOrderItemServices } from '~/server/utils/json-shapes'

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
    .limit(50)

  if (!userOrders.length) return []

  const ids = userOrders.map(o => o.id)

  const [items, history] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)),
    db.select({
      id: orderHistory.id,
      orderId: orderHistory.orderId,
      description: orderHistory.description,
      createdAt: orderHistory.createdAt,
    }).from(orderHistory)
      .where(inArray(orderHistory.orderId, ids))
      .orderBy(asc(orderHistory.createdAt)),
  ])

  const itemsByOrder = new Map<number, typeof items>()
  for (const item of items) {
    const arr = itemsByOrder.get(item.orderId) ?? []
    arr.push(item)
    itemsByOrder.set(item.orderId, arr)
  }

  const historyByOrder = new Map<number, typeof history>()
  for (const entry of history) {
    const arr = historyByOrder.get(entry.orderId) ?? []
    arr.push(entry)
    historyByOrder.set(entry.orderId, arr)
  }

  return userOrders.map(order => ({
    ...order,
    items: (itemsByOrder.get(order.id) ?? []).map(item => ({
      ...item,
      services: parseOrderItemServices(item.services),
    })),
    history: historyByOrder.get(order.id) ?? [],
  }))
})
