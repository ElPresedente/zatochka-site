import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orders, users, type OrderStatus } from '~/server/db/schema'
import { parseOptionalString, parseRouteId } from '~/server/utils/validators'
import { recalcOrderItems, type OrderItemInput } from '~/server/services/orders'
import { buildAdjustmentReceiptItem, createYookassaPayment, createYookassaRefund } from '~/server/utils/yookassa'
import { ORDER_STATUS_LABELS } from '~/types/api'

const ITEMS_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])

function formatRub(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function parseOptionalItems(input: unknown): OrderItemInput[] | undefined {
  if (input === undefined) return undefined
  if (!Array.isArray(input)) {
    throw createError({ statusCode: 400, message: 'Некорректный состав заказа' })
  }
  if (input.length === 0) {
    throw createError({ statusCode: 400, message: 'В заказе должна быть хотя бы одна позиция' })
  }
  return input.map((item) => {
    const productId = Number(item?.productId)
    const quantity = Number(item?.quantity)
    if (!Number.isInteger(productId) || productId <= 0) {
      throw createError({ statusCode: 400, message: 'Некорректный товар в составе заказа' })
    }
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 1000) {
      throw createError({ statusCode: 400, message: 'Некорректное количество товара в заказе' })
    }
    const unitPrice = item?.unitPrice !== undefined ? Number(item.unitPrice) : undefined
    if (unitPrice !== undefined && (!Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > 100_000_000)) {
      throw createError({ statusCode: 400, message: 'Некорректная цена товара в заказе' })
    }
    const serviceIds = Array.isArray(item?.serviceIds)
      ? (item.serviceIds as unknown[]).filter((s): s is string => typeof s === 'string')
      : []
    return { productId, quantity, unitPrice, serviceIds }
  })
}

export default defineEventHandler(async (event) => {
  const adminId = event.context.userId as number
  const id = parseRouteId(getRouterParam(event, 'id'), 'заказа')

  const body = await readBody(event)
  const sellerComment = parseOptionalString(body?.sellerComment, 'Комментарий продавца', { max: 2000 })
  const items = parseOptionalItems(body?.items)

  if (sellerComment === undefined && items === undefined) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const db = useDb()

  // Load order before transaction to capture pre-change state for YooKassa calls
  const [preOrder] = await db.select().from(orders).where(eq(orders.id, id))
  if (!preOrder) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }

  const updated = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id))
    if (!order) {
      throw createError({ statusCode: 404, message: 'Заказ не найден' })
    }

    const status = order.status as OrderStatus
    let nextTotalAmount: number | undefined
    const historyParts: string[] = []

    if (items !== undefined) {
      if (!ITEMS_EDITABLE_STATUSES.has(status)) {
        throw createError({
          statusCode: 409,
          message: `Состав заказа можно менять только в статусах «${[...ITEMS_EDITABLE_STATUSES].map(s => ORDER_STATUS_LABELS[s]).join('», «')}»`,
        })
      }

      const { itemsTotal, addedNames, removedNames } = await recalcOrderItems(tx, {
        orderId: id,
        status,
        newItems: items,
      })

      nextTotalAmount = itemsTotal

      const itemParts: string[] = []
      if (addedNames.length) itemParts.push(`добавлено: ${addedNames.map(n => `«${n}»`).join(', ')}`)
      if (removedNames.length) itemParts.push(`удалено: ${removedNames.map(n => `«${n}»`).join(', ')}`)
      historyParts.push(itemParts.length > 0
        ? `Состав заказа изменён (${itemParts.join('; ')})`
        : 'Цены или количество позиций обновлены')

      if (nextTotalAmount !== order.totalAmount) {
        historyParts.push(`Сумма: ${formatRub(order.totalAmount)} → ${formatRub(nextTotalAmount)}`)
      }
    }

    const commentChanged = sellerComment !== undefined && sellerComment.trim() !== order.sellerComment.trim()
    if (commentChanged) {
      historyParts.push('Обновлён комментарий продавца')
    }

    const update: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() }
    if (sellerComment !== undefined) update.sellerComment = sellerComment
    if (nextTotalAmount !== undefined) update.totalAmount = nextTotalAmount

    const [result] = await tx.update(orders)
      .set(update)
      .where(eq(orders.id, id))
      .returning()

    if (historyParts.length > 0) {
      await tx.insert(orderHistory).values({
        orderId: id,
        adminId,
        description: historyParts.join('. '),
      })
    }

    return result
  })

  // After transaction: handle YooKassa for paid orders where total changed
  if (items !== undefined && preOrder.paymentStatus === 'paid' && updated.totalAmount !== preOrder.totalAmount) {
    const diff = updated.totalAmount - preOrder.totalAmount

    // Resolve customer email for receipt
    let email = preOrder.customerEmail || ''
    if (!email && preOrder.userId) {
      const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, preOrder.userId))
      email = u?.email || ''
    }

    if (diff < 0) {
      // Partial refund
      const refundAmount = -diff
      const receipt = email
        ? { email, items: [buildAdjustmentReceiptItem(`Корректировка заказа №${id}`, refundAmount)] }
        : undefined
      try {
        await createYookassaRefund(preOrder.yookassaPaymentId!, refundAmount, receipt)
        await db.insert(orderHistory).values({
          orderId: id,
          adminId,
          description: `Частичный возврат ${formatRub(refundAmount)} выполнен через ЮKassa (корректировка состава).`,
        })
      }
      catch (err) {
        console.error('[yookassa] partial refund failed', err)
        await db.insert(orderHistory).values({
          orderId: id,
          adminId,
          description: `ВНИМАНИЕ: автоматический возврат ${formatRub(refundAmount)} не выполнен. Выполните возврат вручную в ЛК ЮKassa.`,
        })
      }
    }
    else {
      // Extra payment required
      const extraAmount = diff
      const receipt = email
        ? { email, items: [buildAdjustmentReceiptItem(`Доплата по заказу №${id}`, extraAmount)] }
        : undefined
      const config = useRuntimeConfig()
      const siteUrl = config.siteUrl || getRequestURL(event).origin
      const returnUrl = `${siteUrl}/payment/return?order_id=${id}`
      try {
        const payment = await createYookassaPayment(id, extraAmount, returnUrl, receipt, 'extra')
        await db.update(orders).set({
          extraPaymentId: payment.id,
          extraPaymentAmount: extraAmount,
          extraPaymentStatus: 'pending',
          updatedAt: new Date(),
        }).where(eq(orders.id, id))
        await db.insert(orderHistory).values({
          orderId: id,
          adminId,
          description: `Создан запрос на доплату ${formatRub(extraAmount)} (корректировка состава). Клиенту доступна кнопка «Доплатить» в личном кабинете.`,
        })
      }
      catch (err) {
        console.error('[yookassa] extra payment creation failed', err)
        await db.insert(orderHistory).values({
          orderId: id,
          adminId,
          description: `ВНИМАНИЕ: ссылка на доплату ${formatRub(extraAmount)} не создана автоматически. Создайте платёж вручную в ЛК ЮKassa.`,
        })
      }
    }

    // Re-fetch to include extra payment fields
    const [fresh] = await db.select().from(orders).where(eq(orders.id, id))
    return fresh ?? updated
  }

  return updated
})
