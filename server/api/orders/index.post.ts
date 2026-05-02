import { and, eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orderItems, orders, products, users, type OrderStatus } from '~/server/db/schema'
import { safeJsonParse } from '~/server/utils/validators'

interface OrderItemInput {
  id: number
  qty: number
}

function parseItems(input: unknown): OrderItemInput[] {
  if (!Array.isArray(input)) {
    throw createError({ statusCode: 400, message: 'Корзина пуста' })
  }

  const items = input.map((item: any) => ({
    id: Number(item?.id),
    qty: Number(item?.qty),
  })).filter(item => Number.isInteger(item.id) && Number.isInteger(item.qty) && item.id > 0 && item.qty > 0)

  if (items.length === 0) {
    throw createError({ statusCode: 400, message: 'Корзина пуста' })
  }

  const merged = new Map<number, number>()
  for (const item of items) {
    merged.set(item.id, (merged.get(item.id) ?? 0) + item.qty)
  }

  return [...merged.entries()].map(([id, qty]) => {
    if (qty > 999) {
      throw createError({ statusCode: 400, message: 'Некорректное количество товара' })
    }
    return { id, qty }
  })
}

function parseComment(input: unknown) {
  if (input === undefined || input === null) return ''
  if (typeof input !== 'string') {
    throw createError({ statusCode: 400, message: 'Некорректный комментарий к заказу' })
  }
  const comment = input.trim()
  if (comment.length > 1000) {
    throw createError({ statusCode: 400, message: 'Комментарий к заказу слишком длинный' })
  }
  return comment
}

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const body = await readBody(event)
  const cartItems = parseItems(body?.items)
  const userComment = parseComment(body?.comment)
  const productIds = cartItems.map(item => item.id)

  const db = useDb()
  const [user] = await db.select().from(users).where(eq(users.id, session.data.userId))
  if (!user) {
    throw createError({ statusCode: 401, message: 'Пользователь не найден' })
  }

  const productRows = await db.select().from(products)
    .where(and(inArray(products.id, productIds), eq(products.active, true)))
  const productById = new Map(productRows.map(product => [product.id, product]))

  const itemsToInsert = cartItems.map((item) => {
    const product = productById.get(item.id)
    if (!product) {
      throw createError({ statusCode: 400, message: 'В корзине есть недоступный товар' })
    }
    if (product.stock < item.qty) {
      throw createError({
        statusCode: 409,
        message: `Недостаточно товара «${product.name}» в наличии`,
      })
    }

    const photos = safeJsonParse<string[]>(product.photos, [])
    return {
      productId: product.id,
      productName: product.name,
      productPhoto: photos[0] ?? '',
      unitPrice: product.price,
      quantity: item.qty,
      totalPrice: product.price * item.qty,
    }
  })

  const totalAmount = itemsToInsert.reduce((sum, item) => sum + item.totalPrice, 0)

  const order = await db.transaction(async (tx) => {
    const [createdOrder] = await tx.insert(orders).values({
      userId: user.id,
      customerFirstName: user.firstName,
      customerLastName: user.lastName,
      customerPhone: user.phone,
      userComment,
      status: 'created',
      totalAmount,
    }).returning()

    await tx.insert(orderItems).values(itemsToInsert.map(item => ({
      ...item,
      orderId: createdOrder.id,
    })))

    return createdOrder
  })

  await notifyOrderCreated({
    id: order.id,
    customerName: `${order.customerFirstName} ${order.customerLastName}`,
    customerPhone: order.customerPhone,
    totalAmount: order.totalAmount,
    status: order.status as OrderStatus,
  })

  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
  }
})
