import { and, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders, users } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'
import { buildAdjustmentReceiptItem, createYookassaPayment } from '~/server/utils/yookassa'

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
  if (!order.extraPaymentAmount || order.extraPaymentAmount <= 0) {
    throw createError({ statusCode: 409, message: 'Нет доплаты по этому заказу' })
  }
  if (order.extraPaymentStatus === 'paid') {
    throw createError({ statusCode: 409, message: 'Доплата уже выполнена' })
  }
  if (['cancelled', 'completed'].includes(order.status)) {
    throw createError({ statusCode: 409, message: 'Нельзя доплатить по отменённому или завершённому заказу' })
  }

  let email = order.customerEmail || ''
  if (!email) {
    const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, session.data.userId))
    email = u?.email || ''
  }
  if (!email) {
    throw createError({ statusCode: 400, message: 'Для онлайн-оплаты укажите email в профиле' })
  }

  const config = useRuntimeConfig()
  const siteUrl = config.siteUrl || getRequestURL(event).origin
  const returnUrl = `${siteUrl}/payment/return?order_id=${order.id}`

  const receipt = {
    email,
    items: [buildAdjustmentReceiptItem(`Доплата по заказу №${order.id}`, order.extraPaymentAmount)],
  }

  const payment = await createYookassaPayment(
    order.id,
    order.extraPaymentAmount,
    returnUrl,
    receipt,
    'extra',
  )

  await db.update(orders)
    .set({ extraPaymentId: payment.id, extraPaymentStatus: 'pending' })
    .where(eq(orders.id, order.id))

  return { confirmationUrl: payment.confirmationUrl }
})
