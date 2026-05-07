import { eq, inArray, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders, products, type OrderStatus } from '~/server/db/schema'
import { safeJsonParse } from '~/server/utils/validators'

const PRICE_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])
const ITEMS_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])

const STATUS_LABELS: Record<string, string> = {
  created: 'Создан', accepted: 'Принят', in_progress: 'В работе',
  ready: 'Готов к выдаче', completed: 'Завершён', cancelled: 'Отменён',
}

function formatRub(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function parseOptionalComment(input: unknown) {
  if (input === undefined) return undefined
  if (input === null) return ''
  if (typeof input !== 'string') {
    throw createError({ statusCode: 400, message: 'Некорректный комментарий продавца' })
  }
  const comment = input.trim()
  if (comment.length > 2000) {
    throw createError({ statusCode: 400, message: 'Комментарий продавца слишком длинный' })
  }
  return comment
}

function parseOptionalTotalAmount(input: unknown) {
  if (input === undefined) return undefined
  const totalAmount = Number(input)
  if (!Number.isInteger(totalAmount) || totalAmount < 0 || totalAmount > 100_000_000) {
    throw createError({ statusCode: 400, message: 'Некорректная сумма заказа' })
  }
  return totalAmount
}

function parseOptionalItems(input: unknown) {
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
    return { productId, quantity, unitPrice }
  })
}

export default defineEventHandler(async (event) => {
  const adminId = event.context.userId as number
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID заказа' })
  }

  const body = await readBody(event)
  const sellerComment = parseOptionalComment(body?.sellerComment)
  const totalAmount = parseOptionalTotalAmount(body?.totalAmount)
  const items = parseOptionalItems(body?.items)

  if (sellerComment === undefined && totalAmount === undefined && items === undefined) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const db = useDb()

  const updatedOrder = await db.transaction(async (tx) => {
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
          message: `Состав заказа можно менять только в статусах «${[...ITEMS_EDITABLE_STATUSES].map(s => STATUS_LABELS[s]).join('», «')}»`,
        })
      }

      // Merge duplicates by productId
      const mergedMap = new Map<number, { quantity: number, unitPrice?: number }>()
      for (const item of items) {
        const ex = mergedMap.get(item.productId)
        if (ex) { ex.quantity += item.quantity }
        else { mergedMap.set(item.productId, { quantity: item.quantity, unitPrice: item.unitPrice }) }
      }

      const productIds = [...mergedMap.keys()]
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds))
      if (productRows.length !== productIds.length) {
        throw createError({ statusCode: 400, message: 'В составе заказа есть несуществующий товар' })
      }
      const productById = new Map(productRows.map(p => [p.id, p]))

      const oldItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      const oldByProductId = new Map(
        oldItems.filter(i => i.productId !== null).map(i => [i.productId as number, i]),
      )

      // For accepted/in_progress: restore stock for removed items before deleting
      if (status !== 'created') {
        for (const [productId, oldItem] of oldByProductId) {
          if (!mergedMap.has(productId) && oldItem.stockDeducted > 0) {
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${oldItem.stockDeducted}` })
              .where(eq(products.id, productId))
          }
        }
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, id))

      // Build history description
      const addedNames: string[] = []
      const removedNames: string[] = []
      for (const [productId, oldItem] of oldByProductId) {
        if (!mergedMap.has(productId)) removedNames.push(oldItem.productName)
      }

      const nextItems = []
      for (const [productId, { quantity, unitPrice: bodyUnitPrice }] of mergedMap) {
        const product = productById.get(productId)!
        const unitPrice = bodyUnitPrice !== undefined ? bodyUnitPrice : product.price
        const oldItem = oldByProductId.get(productId)
        let stockDeducted = oldItem?.stockDeducted ?? 0

        // Adjust stock for accepted/in_progress
        if (status !== 'created') {
          const oldStockDeducted = oldItem?.stockDeducted ?? 0
          const stockDiff = quantity - oldStockDeducted
          if (stockDiff > 0) {
            const [current] = await tx
              .select({ stock: products.stock })
              .from(products)
              .where(eq(products.id, productId))
            if ((current?.stock ?? 0) < stockDiff) {
              throw createError({ statusCode: 409, message: `Недостаточно товара «${product.name}» в наличии` })
            }
            await tx.update(products)
              .set({ stock: sql`${products.stock} - ${stockDiff}` })
              .where(eq(products.id, productId))
          }
          else if (stockDiff < 0) {
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${Math.abs(stockDiff)}` })
              .where(eq(products.id, productId))
          }
          stockDeducted = quantity
        }

        if (!oldItem) addedNames.push(product.name)

        nextItems.push({
          orderId: id,
          productId: product.id,
          productName: product.name,
          productPhoto: safeJsonParse<string[]>(product.photos, [])[0] ?? '',
          unitPrice,
          quantity,
          totalPrice: unitPrice * quantity,
          stockDeducted,
        })
      }

      await tx.insert(orderItems).values(nextItems)

      const itemsTotal = nextItems.reduce((sum, item) => sum + item.totalPrice, 0)
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

  return updatedOrder
})
