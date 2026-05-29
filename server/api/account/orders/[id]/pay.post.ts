import { and, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderItems, orders, users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'
import { createYookassaPayment, buildReceiptItems } from '~/server/utils/yookassa'
import { parseOrderItemServices } from '~/server/utils/json-shapes'

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
  if (!['unpaid', 'failed'].includes(order.paymentStatus)) {
    throw createError({ statusCode: 409, message: 'Заказ уже оплачен или не может быть оплачен' })
  }
  if (['cancelled', 'completed'].includes(order.status)) {
    throw createError({ statusCode: 409, message: 'Нельзя оплатить отменённый или завершённый заказ' })
  }

  // Email: snapshot заказа → профиль пользователя
  let email = order.customerEmail || ''
  if (!email) {
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.data.userId))
    email = user?.email || ''
  }
  if (!email) {
    throw createError({ statusCode: 400, message: 'Для онлайн-оплаты укажите email в профиле' })
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
  const receiptItems = buildReceiptItems(items.map(item => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    services: parseOrderItemServices(item.services),
  })))

  const config = useRuntimeConfig()
  const siteUrl = config.siteUrl || getRequestURL(event).origin
  const returnUrl = `${siteUrl}/payment/return?order_id=${order.id}`

  const payment = await createYookassaPayment(
    order.id,
    order.totalAmount,
    returnUrl,
    { email, items: receiptItems },
  )

  const updateData: Partial<typeof orders.$inferInsert> = { yookassaPaymentId: payment.id }
  if (order.paymentMethod === 'cash') {
    updateData.paymentMethod = 'online_card'
  }
  await db.update(orders)
    .set(updateData)
    .where(eq(orders.id, order.id))

  return { confirmationUrl: payment.confirmationUrl }
})
