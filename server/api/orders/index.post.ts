import { and, eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders, products, users, type OrderStatus } from '~/server/db/schema'
import { userPublicColumns } from '~/server/db/projections'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { parseOptionalString } from '~/server/utils/validators'
import { parseProductPhotos, parseProductServices } from '~/server/utils/json-shapes'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ORDERS = 10

function getRateLimitKey(event: H3Event, userId: number) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `order:${ip}:${userId}`
}

interface OrderItemInput {
  id: number
  qty: number
  serviceIds: string[]
}

function parseItems(input: unknown): OrderItemInput[] {
  if (!Array.isArray(input)) {
    throw createError({ statusCode: 400, message: 'Корзина пуста' })
  }

  const items = input.map((item: any) => ({
    id: Number(item?.id),
    qty: Number(item?.qty),
    serviceIds: Array.isArray(item?.serviceIds)
      ? item.serviceIds.filter((s: unknown) => typeof s === 'string')
      : [],
  })).filter(item => Number.isInteger(item.id) && Number.isInteger(item.qty) && item.id > 0 && item.qty > 0)

  if (items.length === 0) {
    throw createError({ statusCode: 400, message: 'Корзина пуста' })
  }

  for (const item of items) {
    if (item.qty > 999) {
      throw createError({ statusCode: 400, message: 'Некорректное количество товара' })
    }
  }

  return items
}

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session.data.userId) {
    throw createError({ statusCode: 401, message: 'Не авторизован' })
  }

  const rateLimit = {
    key: getRateLimitKey(event, session.data.userId),
    windowMs: WINDOW_MS,
    max: MAX_ORDERS,
    message: 'Слишком много заказов. Попробуйте позже.',
  }
  await assertRateLimit(rateLimit)

  const body = await readBody(event)
  const cartItems = parseItems(body?.items)
  const userComment = parseOptionalString(body?.comment, 'Комментарий к заказу', { max: 1000 }) ?? ''
  const productIds = [...new Set(cartItems.map(item => item.id))]

  const db = useDb()

  const txResult = await db.transaction(async (tx) => {
    const [user] = await tx.select(userPublicColumns).from(users).where(eq(users.id, session.data.userId!))
    if (!user) {
      throw createError({ statusCode: 401, message: 'Пользователь не найден' })
    }

    const productRows = await tx.select().from(products)
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

      const allServices = parseProductServices(product.services)
      const selectedServices = item.serviceIds
        .map(sid => allServices.find(s => s.id === sid))
        .filter((s): s is { id: string, name: string, price: number } => !!s)

      const servicesTotal = selectedServices.reduce((s, sv) => s + sv.price, 0)
      const unitPrice = product.price + servicesTotal

      const photos = parseProductPhotos(product.photos)
      return {
        productId: product.id,
        productName: product.name,
        productPhoto: photos[0] ?? '',
        unitPrice,
        quantity: item.qty,
        totalPrice: unitPrice * item.qty,
        services: JSON.stringify(selectedServices.map(s => ({ name: s.name, price: s.price }))),
      }
    })

    const totalAmount = itemsToInsert.reduce((sum, item) => sum + item.totalPrice, 0)

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

    await tx.insert(orderHistory).values({
      orderId: createdOrder.id,
      adminId: null,
      description: 'Заказ оформлен',
    })

    return { createdOrder, itemsToInsert }
  })

  const { createdOrder, itemsToInsert: notifyItems } = txResult

  await recordRateLimitHit(rateLimit)

  await notifyOrderCreated({
    id: createdOrder.id,
    totalAmount: createdOrder.totalAmount,
    status: createdOrder.status as OrderStatus,
    items: notifyItems.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      services: JSON.parse(item.services) as { name: string; price: number }[],
    })),
  })

  return {
    id: createdOrder.id,
    status: createdOrder.status,
    totalAmount: createdOrder.totalAmount,
    createdAt: createdOrder.createdAt,
  }
})
