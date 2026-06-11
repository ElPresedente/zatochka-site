import { and, eq, inArray } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { orderHistory, orderItems, orders, products, users, type OrderStatus } from '~/server/db/schema'
import { userPublicColumns } from '~/server/db/projections'
import { assertRateLimit, recordRateLimitHit } from '~/server/utils/rate-limit'
import { parseOptionalString, parseEmail } from '~/server/utils/validators'
import { parseProductPhotos, parseProductServices } from '~/server/utils/json-shapes'
import { createYookassaPayment, buildReceiptItems } from '~/server/utils/yookassa'
import { sendOrderCreatedEmail } from '~/server/utils/auth-emails'
import { getOrelDeliveryConfig, pointInPolygon, calcOrelDeliveryCost } from '~/server/utils/delivery'
import { cdekOfficeTariff } from '~/server/utils/cdek'

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
  const paymentMethodInput = body?.paymentMethod === 'online_card' ? 'online_card' : 'cash'
  const emailInput = parseEmail(body?.email, 'Email', { required: paymentMethodInput === 'online_card' })

  // Delivery fields
  const deliveryMethod = body?.deliveryMethod === 'delivery' ? 'delivery' : 'pickup'
  const deliveryScope = deliveryMethod === 'delivery' && body?.deliveryScope === 'russia' ? 'russia' : 'orel'
  const deliveryAddressInput = typeof body?.deliveryAddress === 'string' ? body.deliveryAddress.trim().slice(0, 500) : ''
  const deliveryCoordsRaw = body?.deliveryCoords
  const deliveryCoords = (deliveryCoordsRaw && typeof deliveryCoordsRaw.lat === 'number' && typeof deliveryCoordsRaw.lon === 'number')
    ? { lat: deliveryCoordsRaw.lat as number, lon: deliveryCoordsRaw.lon as number }
    : null
  const cdekPvzCode = typeof body?.cdekPvzCode === 'string' ? body.cdekPvzCode.trim() : ''
  const cdekPvzAddress = typeof body?.cdekPvzAddress === 'string' ? body.cdekPvzAddress.trim().slice(0, 500) : ''
  const cdekPvzCity = typeof body?.cdekPvzCity === 'string' ? body.cdekPvzCity.trim().slice(0, 100) : ''
  const cdekPvzCityCode = Number.isInteger(body?.cdekPvzCityCode) ? body.cdekPvzCityCode as number : null
  const cdekTariffCodeInput = Number.isInteger(body?.cdekTariffCode) ? body.cdekTariffCode as number : null
  const cdekDaysMin = Number.isInteger(body?.cdekDeliveryDaysMin) ? body.cdekDeliveryDaysMin as number : null
  const cdekDaysMax = Number.isInteger(body?.cdekDeliveryDaysMax) ? body.cdekDeliveryDaysMax as number : null

  if (deliveryMethod === 'delivery' && deliveryScope === 'russia' && !cdekPvzCode) {
    throw createError({ statusCode: 400, message: 'Выберите пункт выдачи СДЭК' })
  }
  if (deliveryMethod === 'delivery' && deliveryScope === 'orel' && !deliveryAddressInput) {
    throw createError({ statusCode: 400, message: 'Укажите адрес доставки' })
  }

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

    const goodsTotal = itemsToInsert.reduce((sum, item) => {
      const svcTotal = (JSON.parse(item.services) as { price: number }[]).reduce((s, sv) => s + sv.price, 0)
      return sum + (item.unitPrice - svcTotal) * item.quantity
    }, 0)
    const itemsTotal = itemsToInsert.reduce((sum, item) => sum + item.totalPrice, 0)

    // Server-side delivery cost calculation
    let deliveryCostCalc = 0
    // Тариф/срок СДЭК пересчитываем на сервере — клиентским значениям не доверяем.
    let cdekTariffCodeResolved = cdekTariffCodeInput
    let cdekDaysMinResolved = cdekDaysMin
    let cdekDaysMaxResolved = cdekDaysMax
    if (deliveryMethod === 'delivery') {
      if (deliveryScope === 'orel') {
        const orelConfig = await getOrelDeliveryConfig()
        if (orelConfig.polygon && deliveryCoords) {
          const inZone = pointInPolygon(deliveryCoords.lat, deliveryCoords.lon, orelConfig.polygon)
          if (!inZone) {
            throw createError({ statusCode: 400, message: 'Адрес доставки находится вне зоны доставки по Орлу' })
          }
        }
        deliveryCostCalc = calcOrelDeliveryCost(goodsTotal, orelConfig)
      }
      else if (deliveryScope === 'russia' && cdekPvzCityCode) {
        try {
          const goods = itemsToInsert.map(() => ({
            weight: 1000, length: 10, width: 10, height: 10,
          }))
          const tariff = await cdekOfficeTariff(cdekPvzCityCode, goods)
          if (tariff) {
            deliveryCostCalc = tariff.sum
            cdekTariffCodeResolved = tariff.code
            cdekDaysMinResolved = tariff.daysMin
            cdekDaysMaxResolved = tariff.daysMax
          }
          else {
            deliveryCostCalc = typeof body?.cdekDeliveryCost === 'number' ? body.cdekDeliveryCost : 0
          }
        }
        catch (err) {
          console.error('[cdek] Tariff verification failed, using client value', err)
          deliveryCostCalc = typeof body?.cdekDeliveryCost === 'number' ? body.cdekDeliveryCost : 0
        }
      }
    }

    const totalAmount = itemsTotal + deliveryCostCalc

    const [createdOrder] = await tx.insert(orders).values({
      userId: user.id,
      customerFirstName: user.firstName,
      customerLastName: user.lastName,
      customerPhone: user.phone,
      customerEmail: emailInput,
      userComment,
      status: 'created',
      totalAmount,
      paymentMethod: paymentMethodInput,
      deliveryMethod,
      deliveryScope: deliveryMethod === 'delivery' ? deliveryScope : null,
      deliveryAddress: deliveryMethod === 'delivery' && deliveryScope === 'orel' ? deliveryAddressInput : null,
      deliveryCoords: deliveryCoords ? JSON.stringify(deliveryCoords) : null,
      deliveryCost: deliveryCostCalc,
      cdekPvzCode: cdekPvzCode || null,
      cdekPvzAddress: cdekPvzAddress || null,
      cdekPvzCity: cdekPvzCity || null,
      cdekTariffCode: cdekTariffCodeResolved,
      cdekDeliveryDaysMin: cdekDaysMinResolved,
      cdekDeliveryDaysMax: cdekDaysMaxResolved,
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

    return { createdOrder, itemsToInsert, userEmail: user.email }
  })

  const { createdOrder, itemsToInsert: notifyItems, userEmail } = txResult

  // Сохранить email в профиле если предоставлен
  if (emailInput) {
    await db.update(users)
      .set({ email: emailInput })
      .where(eq(users.id, session.data.userId))
  }

  await recordRateLimitHit(rateLimit)

  const notifyItemsParsed = notifyItems.map(item => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    services: JSON.parse(item.services) as { name: string; price: number }[],
  }))

  await notifyOrderCreated({
    id: createdOrder.id,
    totalAmount: createdOrder.totalAmount,
    status: createdOrder.status as OrderStatus,
    paymentMethod: paymentMethodInput,
    items: notifyItemsParsed,
  })

  // Письмо клиенту о принятом заказе (на email заказа либо аккаунта).
  await sendOrderCreatedEmail({
    email: createdOrder.customerEmail || userEmail || '',
    firstName: createdOrder.customerFirstName,
    orderId: createdOrder.id,
    totalAmount: createdOrder.totalAmount,
    items: notifyItemsParsed.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      services: item.services,
    })),
  })

  if (paymentMethodInput === 'online_card') {
    const config = useRuntimeConfig()
    const siteUrl = config.siteUrl || getRequestURL(event).origin
    const returnUrl = `${siteUrl}/payment/return?order_id=${createdOrder.id}`

    const parsedItems = notifyItems.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      services: JSON.parse(item.services) as { name: string; price: number }[],
    }))

    try {
      const payment = await createYookassaPayment(
        createdOrder.id,
        createdOrder.totalAmount,
        returnUrl,
        { email: emailInput, items: buildReceiptItems(parsedItems) },
      )
      await db.update(orders)
        .set({ yookassaPaymentId: payment.id })
        .where(eq(orders.id, createdOrder.id))

      return {
        id: createdOrder.id,
        status: createdOrder.status,
        totalAmount: createdOrder.totalAmount,
        createdAt: createdOrder.createdAt,
        confirmationUrl: payment.confirmationUrl,
      }
    }
    catch (err) {
      console.error('[yookassa] Failed to create payment for order', createdOrder.id, err)
    }
  }

  return {
    id: createdOrder.id,
    status: createdOrder.status,
    totalAmount: createdOrder.totalAmount,
    createdAt: createdOrder.createdAt,
  }
})
