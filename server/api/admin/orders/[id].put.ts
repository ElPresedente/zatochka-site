import { eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderItems, orders, products, type OrderStatus } from '~/server/db/schema'

const PRICE_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'accepted', 'in_progress'])
const ITEMS_EDITABLE_STATUSES = new Set<OrderStatus>(['created'])

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
    return { productId, quantity }
  })
}

export default defineEventHandler(async (event) => {
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
    let requiresPriceChangeComment = false

    if (items !== undefined) {
      if (!ITEMS_EDITABLE_STATUSES.has(status)) {
        throw createError({ statusCode: 409, message: 'Состав заказа можно менять только в статусе «Создан»' })
      }

      const mergedItems = new Map<number, number>()
      for (const item of items) {
        mergedItems.set(item.productId, (mergedItems.get(item.productId) ?? 0) + item.quantity)
      }

      const productIds = [...mergedItems.keys()]
      const productRows = await tx.select().from(products).where(inArray(products.id, productIds))
      if (productRows.length !== productIds.length) {
        throw createError({ statusCode: 400, message: 'В составе заказа есть несуществующий товар' })
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, id))

      const nextItems = productRows.map((product) => {
        const quantity = mergedItems.get(product.id) ?? 0
        return {
          orderId: id,
          productId: product.id,
          productName: product.name,
          productPhoto: (JSON.parse(product.photos) as string[])[0] ?? '',
          unitPrice: product.price,
          quantity,
          totalPrice: product.price * quantity,
        }
      })

      await tx.insert(orderItems).values(nextItems)
      const itemsTotalAmount = nextItems.reduce((sum, item) => sum + item.totalPrice, 0)
      nextTotalAmount = totalAmount ?? itemsTotalAmount
      requiresPriceChangeComment = totalAmount !== undefined && totalAmount !== itemsTotalAmount
    }

    const priceChanged = requiresPriceChangeComment
      || (nextTotalAmount !== undefined && nextTotalAmount !== order.totalAmount && items === undefined)

    if (priceChanged) {
      if (!PRICE_EDITABLE_STATUSES.has(status)) {
        throw createError({ statusCode: 409, message: 'Сумму можно менять только в статусах «Создан», «Принят» или «В работе»' })
      }
      if (!nextSellerComment.trim()) {
        throw createError({
          statusCode: 400,
          message: 'При изменении суммы нужно заполнить комментарий продавца',
        })
      }
    }

    const update: Partial<typeof orders.$inferInsert> = { updatedAt: new Date() }
    if (sellerComment !== undefined) update.sellerComment = sellerComment
    if (nextTotalAmount !== undefined) update.totalAmount = nextTotalAmount

    const [updated] = await tx.update(orders)
      .set(update)
      .where(eq(orders.id, id))
      .returning()

    return updated
  })

  return updatedOrder
})
