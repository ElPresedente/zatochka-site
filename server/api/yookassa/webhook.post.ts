import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders, orderItems } from '~/server/db/schema'
import { fetchYookassaPayment } from '~/server/utils/yookassa'
import { cdekCreateOrder, CDEK_SENDER_CITY_CODE } from '~/server/utils/cdek'

export default defineEventHandler(async (event) => {
  let body: any
  try {
    body = await readBody(event)
  }
  catch {
    return { ok: true }
  }

  if (body?.type !== 'notification') return { ok: true }

  const paymentId = body?.object?.id
  if (typeof paymentId !== 'string' || !paymentId) return { ok: true }

  try {
    const payment = await fetchYookassaPayment(paymentId)
    const orderId = parseInt(payment.metadata?.order_id ?? '0')
    if (!orderId) return { ok: true }

    const db = useDb()
    const isExtra = payment.metadata?.payment_type === 'extra'

    if (isExtra) {
      // Extra (top-up) payment for a composition adjustment
      if (payment.status === 'succeeded') {
        await db.update(orders)
          .set({ extraPaymentStatus: 'paid' })
          .where(and(eq(orders.id, orderId), eq(orders.extraPaymentId, paymentId)))
      }
      else if (payment.status === 'canceled') {
        await db.update(orders)
          .set({ extraPaymentStatus: 'failed' })
          .where(and(eq(orders.id, orderId), eq(orders.extraPaymentId, paymentId)))
      }
      return { ok: true }
    }

    if (payment.status === 'succeeded') {
      const [updatedOrder] = await db.update(orders)
        .set({ paymentStatus: 'paid', paidAt: new Date() })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.yookassaPaymentId, paymentId),
          ne(orders.paymentStatus, 'paid'),
        ))
        .returning()

      // Auto-create CDEK order if applicable
      if (updatedOrder && updatedOrder.deliveryMethod === 'delivery' && updatedOrder.deliveryScope === 'russia'
        && updatedOrder.cdekPvzCode && updatedOrder.cdekTariffCode && !updatedOrder.cdekOrderUuid) {
        try {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
          const cdekResult = await cdekCreateOrder({
            tariff_code: updatedOrder.cdekTariffCode,
            sender: { name: 'Острый край', phones: [{ number: '+74740000000' }] },
            recipient: {
              name: `${updatedOrder.customerFirstName} ${updatedOrder.customerLastName}`.trim(),
              phones: [{ number: updatedOrder.customerPhone }],
              email: updatedOrder.customerEmail || undefined,
            },
            from_location: { code: CDEK_SENDER_CITY_CODE },
            delivery_point: updatedOrder.cdekPvzCode,
            packages: [{
              number: String(orderId),
              weight: Math.max(100, items.reduce((s) => s + 100, 0)),
              length: 10,
              width: 10,
              height: 10,
              items: items.map(item => ({
                name: item.productName,
                ware_key: String(item.productId ?? item.id),
                payment: { value: 0 },
                cost: item.unitPrice,
                amount: item.quantity,
                weight: 100,
              })),
            }],
            comment: updatedOrder.userComment || undefined,
          })
          const cdekUuid = cdekResult?.entity?.uuid
          if (cdekUuid) {
            await db.update(orders).set({ cdekOrderUuid: cdekUuid }).where(eq(orders.id, orderId))
          }
        }
        catch (err) {
          console.error('[cdek] Failed to create CDEK order for', orderId, err)
        }
      }
    }
    else if (payment.status === 'canceled') {
      await db.update(orders)
        .set({ paymentStatus: 'failed' })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.yookassaPaymentId, paymentId),
          ne(orders.paymentStatus, 'paid'),
        ))
    }
    else if (payment.status === 'waiting_for_capture') {
      await db.update(orders)
        .set({ paymentStatus: 'waiting_for_capture' })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.yookassaPaymentId, paymentId),
          ne(orders.paymentStatus, 'paid'),
        ))
    }
  }
  catch (err) {
    console.error('[yookassa] webhook processing error', err)
  }

  return { ok: true }
})
