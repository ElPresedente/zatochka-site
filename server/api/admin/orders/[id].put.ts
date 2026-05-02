import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders, type OrderStatus } from '~/server/db/schema'

const PRICE_EDITABLE_STATUSES = new Set<OrderStatus>(['created', 'in_progress'])

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

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID заказа' })
  }

  const body = await readBody(event)
  const sellerComment = parseOptionalComment(body?.sellerComment)
  const totalAmount = parseOptionalTotalAmount(body?.totalAmount)

  if (sellerComment === undefined && totalAmount === undefined) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const db = useDb()

  const [order] = await db.select().from(orders).where(eq(orders.id, id))
  if (!order) {
    throw createError({ statusCode: 404, message: 'Заказ не найден' })
  }

  const status = order.status as OrderStatus
  const nextSellerComment = sellerComment ?? order.sellerComment
  const priceChanged = totalAmount !== undefined && totalAmount !== order.totalAmount

  if (priceChanged) {
    if (!PRICE_EDITABLE_STATUSES.has(status)) {
      throw createError({ statusCode: 409, message: 'Сумму можно менять только в статусах «Создан» или «В работе»' })
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
  if (totalAmount !== undefined) update.totalAmount = totalAmount

  const [updated] = await db.update(orders)
    .set(update)
    .where(eq(orders.id, id))
    .returning()

  return updated
})
