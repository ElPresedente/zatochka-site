import { and, eq, ne } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders } from '~/server/db/schema'
import { fetchYookassaPayment } from '~/server/utils/yookassa'

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
      // Guard: only update if this exact payment is still the active one and not yet marked paid
      await db.update(orders)
        .set({ paymentStatus: 'paid', paidAt: new Date() })
        .where(and(
          eq(orders.id, orderId),
          eq(orders.yookassaPaymentId, paymentId),
          ne(orders.paymentStatus, 'paid'),
        ))
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
