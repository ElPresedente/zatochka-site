import { eq, inArray, sql } from 'drizzle-orm'
import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'
import type { ExtractTablesWithRelations } from 'drizzle-orm'
import { orderItems, products, type OrderStatus } from '~/server/db/schema'
import { parseProductPhotos, parseProductServices } from '~/server/utils/json-shapes'

export interface OrderItemInput {
  productId: number
  quantity: number
  unitPrice?: number
  serviceIds: string[]
}

export interface RecalcResult {
  itemsTotal: number
  addedNames: string[]
  removedNames: string[]
}

// Принимаем tx с любой формой schema — useDb() сейчас не пробрасывает schema generic,
// поэтому endpoint передаёт Record<string, unknown>, а не наш typeof schema.
type Tx = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, unknown>,
  ExtractTablesWithRelations<Record<string, unknown>>
>

function makeItemKey(productId: number, serviceIds: string[]): string {
  const sorted = [...serviceIds].sort()
  return sorted.length ? `${productId}:${sorted.join(',')}` : String(productId)
}

/**
 * Перестраивает позиции заказа и согласует остатки на складе.
 *
 * Контракт:
 *   - Вызывается только внутри транзакции (`tx`).
 *   - Статус заказа должен быть из ITEMS_EDITABLE_STATUSES — проверяется снаружи.
 *   - Списание/возврат остатков выполняется ТОЛЬКО при `status !== 'created'`,
 *     потому что в `created` остаток ещё не списывался (см. CLAUDE.md → "Заказы").
 *   - Дубликаты по (productId, serviceIds) объединяются.
 *   - При нехватке остатков бросает 409.
 */
export async function recalcOrderItems(
  tx: Tx,
  params: { orderId: number, status: OrderStatus, newItems: OrderItemInput[] },
): Promise<RecalcResult> {
  const { orderId, status, newItems } = params

  // 1) Слить дубли (productId + serviceIds)
  type MergedEntry = { productId: number, quantity: number, unitPrice?: number, serviceIds: string[] }
  const mergedMap = new Map<string, MergedEntry>()
  for (const item of newItems) {
    const key = makeItemKey(item.productId, item.serviceIds)
    const ex = mergedMap.get(key)
    if (ex) ex.quantity += item.quantity
    else mergedMap.set(key, { ...item })
  }

  const productIds = [...new Set([...mergedMap.values()].map(e => e.productId))]

  // 2) Загрузить продукты и старые позиции одним заходом каждого типа
  const [productRows, oldItems] = await Promise.all([
    tx.select().from(products).where(inArray(products.id, productIds)),
    tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
  ])
  if (productRows.length !== productIds.length) {
    throw createError({ statusCode: 400, message: 'В составе заказа есть несуществующий товар' })
  }
  const productById = new Map(productRows.map(p => [p.id, p]))

  // 3) Агрегаты для расчёта diff остатков и истории
  const oldStockByProductId = new Map<number, number>()
  const oldProductIds = new Set<number>()
  for (const oldItem of oldItems) {
    if (oldItem.productId !== null) {
      oldStockByProductId.set(
        oldItem.productId,
        (oldStockByProductId.get(oldItem.productId) ?? 0) + oldItem.stockDeducted,
      )
      oldProductIds.add(oldItem.productId)
    }
  }

  const newQtyByProductId = new Map<number, number>()
  for (const entry of mergedMap.values()) {
    newQtyByProductId.set(
      entry.productId,
      (newQtyByProductId.get(entry.productId) ?? 0) + entry.quantity,
    )
  }

  // 4) Если статус уже списанный — проверить достаточность остатков пакетно (без N+1)
  if (status !== 'created') {
    const productsToCheck = [...newQtyByProductId.entries()]
      .filter(([pid, qty]) => qty > (oldStockByProductId.get(pid) ?? 0))
    if (productsToCheck.length > 0) {
      // Остатки уже есть в productRows — отдельный select не нужен,
      // но productRows.stock — это значение ДО апдейтов в этой транзакции.
      // В рамках одной транзакции апдейтов остатков по этим productId до сих пор не было,
      // поэтому productRows.stock актуален.
      for (const [pid, newTotalQty] of productsToCheck) {
        const product = productById.get(pid)!
        const oldDeducted = oldStockByProductId.get(pid) ?? 0
        const diff = newTotalQty - oldDeducted
        if (product.stock < diff) {
          throw createError({
            statusCode: 409,
            message: `Недостаточно товара «${product.name}» в наличии`,
          })
        }
      }
    }
  }

  // 5) Применить diff остатков (один UPDATE на product, без N+1 на чтение)
  if (status !== 'created') {
    // Возврат остатков для полностью убранных товаров
    for (const [productId, oldDeducted] of oldStockByProductId) {
      if (!newQtyByProductId.has(productId) && oldDeducted > 0) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${oldDeducted}` })
          .where(eq(products.id, productId))
      }
    }
    // Diff для оставшихся
    for (const [productId, newTotalQty] of newQtyByProductId) {
      const oldDeducted = oldStockByProductId.get(productId) ?? 0
      const diff = newTotalQty - oldDeducted
      if (diff > 0) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} - ${diff}` })
          .where(eq(products.id, productId))
      }
      else if (diff < 0) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${-diff}` })
          .where(eq(products.id, productId))
      }
    }
  }

  // 6) Удалить старые позиции и собрать новые
  await tx.delete(orderItems).where(eq(orderItems.orderId, orderId))

  const addedNames: string[] = []
  const removedNames: string[] = []
  const reportedRemoved = new Set<number>()
  for (const oldItem of oldItems) {
    if (oldItem.productId && !newQtyByProductId.has(oldItem.productId) && !reportedRemoved.has(oldItem.productId)) {
      reportedRemoved.add(oldItem.productId)
      removedNames.push(oldItem.productName)
    }
  }

  const nextItems: typeof orderItems.$inferInsert[] = []
  const reportedAdded = new Set<number>()
  for (const entry of mergedMap.values()) {
    const product = productById.get(entry.productId)!

    const allServices = parseProductServices(product.services)
    const selectedServices = entry.serviceIds
      .map(sid => allServices.find(s => s.id === sid))
      .filter((s): s is { id: string, name: string, price: number } => !!s)
    const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)

    const unitPrice = entry.unitPrice !== undefined ? entry.unitPrice : product.price + servicesTotal
    const stockDeducted = status !== 'created' ? entry.quantity : 0

    if (!oldProductIds.has(entry.productId) && !reportedAdded.has(entry.productId)) {
      reportedAdded.add(entry.productId)
      addedNames.push(product.name)
    }

    nextItems.push({
      orderId,
      productId: product.id,
      productName: product.name,
      productPhoto: parseProductPhotos(product.photos)[0] ?? '',
      unitPrice,
      quantity: entry.quantity,
      totalPrice: unitPrice * entry.quantity,
      services: JSON.stringify(selectedServices.map(s => ({ name: s.name, price: s.price }))),
      stockDeducted,
    })
  }

  await tx.insert(orderItems).values(nextItems)

  const itemsTotal = nextItems.reduce((sum, item) => sum + item.totalPrice, 0)
  return { itemsTotal, addedNames, removedNames }
}
