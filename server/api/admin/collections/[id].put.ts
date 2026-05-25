import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCollections, productCollectionItems } from '~/server/db/schema'
import { parseNonNegativeInteger, parseRouteId, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'подборка')
  const body = await readBody(event)

  const name = parseTrimmedString(body?.name, 'Название', { required: true, max: 200 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Позиция', 100_000)
  const active = body?.active !== false
  const productIds: number[] = Array.isArray(body?.productIds)
    ? body.productIds.filter((pid: unknown) => typeof pid === 'number' && Number.isInteger(pid) && pid > 0)
    : []

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(productCollections)
      .set({ name, sortOrder, active })
      .where(eq(productCollections.id, id))
      .returning()

    if (updated.length === 0) throw createError({ statusCode: 404, message: 'Подборка не найдена' })

    await tx.delete(productCollectionItems).where(eq(productCollectionItems.collectionId, id))

    if (productIds.length > 0) {
      await tx.insert(productCollectionItems).values(
        productIds.map((pid, idx) => ({ collectionId: id, productId: pid, sortOrder: idx }))
      )
    }
  })

  return { id, name, sortOrder, active, productIds }
})
