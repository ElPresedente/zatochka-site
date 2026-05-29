import { and, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const id = parseRouteId(getRouterParam(event, 'id'), 'заказ')
  const db = useDb()

  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.data.userId)))

  if (!order) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }

  return order
})
