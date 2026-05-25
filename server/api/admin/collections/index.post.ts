import { useDb } from '~/server/db'
import { productCollections, productCollectionItems } from '~/server/db/schema'
import { parseNonNegativeInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const name = parseTrimmedString(body?.name, 'Название', { required: true, max: 200 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Позиция', 100_000)
  const active = body?.active !== false
  const productIds: number[] = Array.isArray(body?.productIds)
    ? body.productIds.filter((id: unknown) => typeof id === 'number' && Number.isInteger(id) && id > 0)
    : []

  const [col] = await db.insert(productCollections).values({ name, sortOrder, active }).returning()

  if (productIds.length > 0) {
    await db.insert(productCollectionItems).values(
      productIds.map((pid, idx) => ({ collectionId: col.id, productId: pid, sortOrder: idx }))
    )
  }

  return { id: col.id, name: col.name, sortOrder: col.sortOrder, active: col.active, productIds }
})
