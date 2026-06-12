import { eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders, orderStatuses, products, users, type OrderStatus } from '~/server/db/schema'
import { createYookassaRefund } from '~/server/utils/yookassa'
import { cdekDeleteOrder } from '~/server/utils/cdek'
import { sendOrderReadyEmail } from '~/server/utils/auth-emails'
import { ORDER_STATUS_LABELS } from '~/types/api'

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
  const adminId = event.context.userId as number
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID заказа' })
  }

  const body = await readBody(event)
  const nextStatus = parseStatus(body?.status)
  const db = useDb()

  // Load order before the transaction to check if refund is needed
  const [preOrder] = await db.select().from(orders).where(eq(orders.id, id))
  if (!preOrder) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }
  assertTransition(preOrder.status as OrderStatus, nextStatus)

  // Refund paid order before cancellation (outside transaction — can't roll back external calls)
  let refundDone = false
  if (nextStatus === 'cancelled' && preOrder.paymentStatus === 'paid' && preOrder.yookassaPaymentId) {
    try {
      await createYookassaRefund(preOrder.yookassaPaymentId, preOrder.totalAmount)
      refundDone = true
    }
    catch (err) {
      console.error('[yookassa] refund failed', err)
      throw createError({
        statusCode: 502,
        message: 'Не удалось выполнить возврат в ЮKassa. Попробуйте ещё раз или выполните возврат вручную в личном кабинете ЮKassa.',
      })
    }
  }

  // Отмена заявки на доставку СДЭК (внешний вызов — вне транзакции).
  // В отличие от возврата, неудача здесь НЕ блокирует отмену заказа: посылку могли уже
  // принять в работу. Просто фиксируем в истории, что нужна ручная отмена.
  let cdekCancelled = false
  let cdekCancelFailed = false
  if (nextStatus === 'cancelled' && preOrder.cdekOrderUuid) {
    try {
      await cdekDeleteOrder(preOrder.cdekOrderUuid)
      cdekCancelled = true
    }
    catch (err) {
      console.error('[cdek] failed to cancel order', preOrder.cdekOrderUuid, err)
      cdekCancelFailed = true
    }
  }

  const updatedOrder = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id))
    if (!order) {
      throw createError({ statusCode: 404, message: 'Заказ не найден' })
    }

    const currentStatus = order.status as OrderStatus
    if (currentStatus === nextStatus) return order

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))

    if (currentStatus === 'created' && nextStatus === 'accepted') {
      for (const item of items) {
        if (!item.productId) continue

        const [product] = await tx.select({ stock: products.stock, name: products.name })
          .from(products)
          .where(eq(products.id, item.productId))

        if ((product?.stock ?? 0) < item.quantity) {
          throw createError({
            statusCode: 409,
            message: `Недостаточно товара «${product?.name ?? `#${item.productId}`}» в наличии (на складе ${product?.stock ?? 0}, в заказе ${item.quantity})`,
          })
        }

        await tx.update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(eq(products.id, item.productId))

        await tx.update(orderItems)
          .set({ stockDeducted: item.quantity })
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

    const orderUpdate: Partial<typeof orders.$inferInsert> = {
      status: nextStatus,
      updatedAt: new Date(),
    }
    if (refundDone) {
      orderUpdate.paymentStatus = 'refunded'
    }

    const [updated] = await tx.update(orders)
      .set(orderUpdate)
      .where(eq(orders.id, id))
      .returning()

    const historyDesc = [`Статус изменён: «${ORDER_STATUS_LABELS[currentStatus]}» → «${ORDER_STATUS_LABELS[nextStatus]}»`]
    if (currentStatus === 'created' && nextStatus === 'accepted') {
      historyDesc.push('остатки товаров списаны')
    }
    if (nextStatus === 'cancelled' && ['accepted', 'in_progress', 'ready'].includes(currentStatus)) {
      historyDesc.push('остатки товаров возвращены')
    }
    if (refundDone) {
      historyDesc.push('возврат средств выполнен через ЮKassa')
    }
    if (cdekCancelled) {
      historyDesc.push('заявка на доставку СДЭК отменена')
    }
    await tx.insert(orderHistory).values({
      orderId: id,
      adminId,
      description: historyDesc.join(', ') + '.',
    })

    if (cdekCancelFailed) {
      await tx.insert(orderHistory).values({
        orderId: id,
        adminId,
        description: 'ВНИМАНИЕ: не удалось автоматически отменить заявку СДЭК (возможно, посылка уже принята в работу). Отмените её вручную в личном кабинете СДЭК.',
      })
    }

    return updated
  })

  // Письмо клиенту о готовности заказа (на email заказа либо аккаунта).
  // Только при реальном переходе в ready, не на повторном выставлении того же статуса.
  if (nextStatus === 'ready' && preOrder.status !== 'ready') {
    let recipientEmail = updatedOrder.customerEmail
    if (!recipientEmail && updatedOrder.userId) {
      const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, updatedOrder.userId))
      recipientEmail = u?.email ?? ''
    }
    if (recipientEmail) {
      await sendOrderReadyEmail({
        email: recipientEmail,
        firstName: updatedOrder.customerFirstName,
        orderId: updatedOrder.id,
      })
    }
  }

  return updatedOrder
})
