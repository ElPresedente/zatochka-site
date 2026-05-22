import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orders, type OrderStatus } from '~/server/db/schema'
import { parseOptionalString, parseRouteId } from '~/server/utils/validators'
import { recalcOrderItems, type OrderItemInput } from '~/server/services/orders'
import { ORDER_STATUS_LABELS } from '~/types/api'

const PRICE_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])
const ITEMS_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])

function formatRub(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function parseOptionalTotalAmount(input: unknown) {
  if (input === undefined) return undefined
  const totalAmount = Number(input)
  if (!Number.isInteger(totalAmount) || totalAmount < 0 || totalAmount > 100_000_000) {
    throw createError({ statusCode: 400, message: 'Некорректная сумма заказа' })
  }
  return totalAmount
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
  const totalAmount = parseOptionalTotalAmount(body?.totalAmount)
  const items = parseOptionalItems(body?.items)

  if (sellerComment === undefined && totalAmount === undefined && items === undefined) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const db = useDb()

  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id))
    if (!order) {
      throw createError({ statusCode: 404, message: 'Заказ не найден' })
    }

    const status = order.status as OrderStatus
    const nextSellerComment = sellerComment ?? order.sellerComment
    let nextTotalAmount = totalAmount
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

      nextTotalAmount = totalAmount ?? itemsTotal

      const itemParts: string[] = []
      if (addedNames.length) itemParts.push(`добавлено: ${addedNames.map(n => `«${n}»`).join(', ')}`)
      if (removedNames.length) itemParts.push(`удалено: ${removedNames.map(n => `«${n}»`).join(', ')}`)
      historyParts.push(itemParts.length > 0
        ? `Состав заказа изменён (${itemParts.join('; ')})`
        : 'Цены или количество позиций обновлены')
    }

    const priceChanged = nextTotalAmount !== undefined && nextTotalAmount !== order.totalAmount
    if (priceChanged) {
      if (!PRICE_EDITABLE_STATUSES.has(status)) {
        throw createError({ statusCode: 409, message: 'Сумму можно менять только в статусах «Создан», «Принят» или «В работе»' })
      }
      if (!nextSellerComment.trim()) {
        throw createError({ statusCode: 400, message: 'При изменении суммы нужно заполнить комментарий продавца' })
      }
      historyParts.push(`Сумма: ${formatRub(order.totalAmount)} → ${formatRub(nextTotalAmount!)}`)
    }

    const commentChanged = sellerComment !== undefined && sellerComment.trim() !== order.sellerComment.trim()
    if (commentChanged && !priceChanged) {
      historyParts.push('Обновлён комментарий продавца')
    }

    const update: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() }
    if (sellerComment !== undefined) update.sellerComment = sellerComment
    if (nextTotalAmount !== undefined) update.totalAmount = nextTotalAmount

    const [updated] = await tx.update(orders)
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

    return updated
  })
})
