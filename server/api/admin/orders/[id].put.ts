import { eq, inArray, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders, products, type OrderStatus } from '~/server/db/schema'
import { safeJsonParse } from '~/server/utils/validators'
import { ORDER_STATUS_LABELS } from '~/types/api'

const PRICE_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])
const ITEMS_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])


function formatRub(amount: number) {
  return `${amount.toLocaleString('ru-RU')} ₽`
}

function makeItemKey(productId: number, serviceIds: string[]): string {
  const sorted = [...serviceIds].sort()
  return sorted.length ? `${productId}:${sorted.join(',')}` : String(productId)
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
    const serviceIds = Array.isArray(item?.serviceIds)
      ? (item.serviceIds as unknown[]).filter((s): s is string => typeof s === 'string')
      : []
    return { productId, quantity, unitPrice, serviceIds }
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
          message: `Состав заказа можно менять только в статусах «${[...ITEMS_EDITABLE_STATUSES].map(s => ORDER_STATUS_LABELS[s]).join('», «')}»`,
        })
      }

      // Merge duplicates by productId:serviceIds key
      type MergedEntry = { productId: number, quantity: number, unitPrice?: number, serviceIds: string[] }
      const mergedMap = new Map<string, MergedEntry>()
      for (const item of items) {
        const key = makeItemKey(item.productId, item.serviceIds)
        const ex = mergedMap.get(key)
        if (ex) { ex.quantity += item.quantity }
        else { mergedMap.set(key, { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, serviceIds: item.serviceIds }) }
      }

      const productIds = [...new Set([...mergedMap.values()].map(e => e.productId))]
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds))
      if (productRows.length !== productIds.length) {
        throw createError({ statusCode: 400, message: 'В составе заказа есть несуществующий товар' })
      }
      const productById = new Map(productRows.map(p => [p.id, p]))

      const oldItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))

      // Aggregate old stock deducted per productId (multiple items per product possible)
      const oldStockByProductId = new Map<number, number>()
      for (const oldItem of oldItems) {
        if (oldItem.productId !== null) {
          oldStockByProductId.set(oldItem.productId, (oldStockByProductId.get(oldItem.productId) ?? 0) + oldItem.stockDeducted)
        }
      }

      // Aggregate new quantities per productId (for stock diff calculation)
      const newQtyByProductId = new Map<number, number>()
      for (const entry of mergedMap.values()) {
        newQtyByProductId.set(entry.productId, (newQtyByProductId.get(entry.productId) ?? 0) + entry.quantity)
      }

      // For accepted/in_progress: restore stock for fully removed products
      if (status !== 'created') {
        for (const [productId, oldDeducted] of oldStockByProductId) {
          if (!newQtyByProductId.has(productId) && oldDeducted > 0) {
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${oldDeducted}` })
              .where(eq(products.id, productId))
          }
        }
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, id))

      // Build history: track added/removed by productId
      const oldProductIds = new Set(oldItems.filter(i => i.productId !== null).map(i => i.productId as number))
      const addedNames: string[] = []
      const removedNames: string[] = []
      const reportedRemoved = new Set<number>()
      for (const oldItem of oldItems) {
        if (oldItem.productId && !newQtyByProductId.has(oldItem.productId) && !reportedRemoved.has(oldItem.productId)) {
          reportedRemoved.add(oldItem.productId)
          removedNames.push(oldItem.productName)
        }
      }

      // For accepted/in_progress: apply stock diff per productId (once per productId)
      const stockAdjusted = new Set<number>()
      if (status !== 'created') {
        for (const [productId, newTotalQty] of newQtyByProductId) {
          if (stockAdjusted.has(productId)) continue
          stockAdjusted.add(productId)
          const oldDeducted = oldStockByProductId.get(productId) ?? 0
          const diff = newTotalQty - oldDeducted
          if (diff > 0) {
            const [current] = await tx.select({ stock: products.stock }).from(products).where(eq(products.id, productId))
            if ((current?.stock ?? 0) < diff) {
              throw createError({ statusCode: 409, message: `Недостаточно товара «${productById.get(productId)!.name}» в наличии` })
            }
            await tx.update(products)
              .set({ stock: sql`${products.stock} - ${diff}` })
              .where(eq(products.id, productId))
          }
          else if (diff < 0) {
            await tx.update(products)
              .set({ stock: sql`${products.stock} + ${Math.abs(diff)}` })
              .where(eq(products.id, productId))
          }
        }
      }

      // Build next items, resolving serviceIds → services snapshot
      const nextItems = []
      for (const entry of mergedMap.values()) {
        const product = productById.get(entry.productId)!

        const allServices = safeJsonParse<{ id: string, name: string, price: number }[]>(product.services, [])
        const selectedServices = entry.serviceIds
          .map(sid => allServices.find(s => s.id === sid))
          .filter((s): s is { id: string, name: string, price: number } => !!s)
        const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)

        const unitPrice = entry.unitPrice !== undefined ? entry.unitPrice : product.price + servicesTotal
        const stockDeducted = status !== 'created' ? entry.quantity : 0

        if (!oldProductIds.has(entry.productId)) addedNames.push(product.name)

        nextItems.push({
          orderId: id,
          productId: product.id,
          productName: product.name,
          productPhoto: safeJsonParse<string[]>(product.photos, [])[0] ?? '',
          unitPrice,
          quantity: entry.quantity,
          totalPrice: unitPrice * entry.quantity,
          services: JSON.stringify(selectedServices.map(s => ({ name: s.name, price: s.price }))),
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
