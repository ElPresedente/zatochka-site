import { asc, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCollections, productCollectionItems } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()

  const cols = await db
    .select()
    .from(productCollections)
    .orderBy(asc(productCollections.sortOrder), asc(productCollections.id))

  if (cols.length === 0) return []

  const colIds = cols.map(c => c.id)
  const items = await db
    .select({
      collectionId: productCollectionItems.collectionId,
      productId: productCollectionItems.productId,
      sortOrder: productCollectionItems.sortOrder,
    })
    .from(productCollectionItems)
    .where(inArray(productCollectionItems.collectionId, colIds))
    .orderBy(asc(productCollectionItems.sortOrder))

  return cols.map(c => ({
    id: c.id,
    name: c.name,
    sortOrder: c.sortOrder,
    active: c.active,
    productIds: items.filter(i => i.collectionId === c.id).map(i => i.productId),
  }))
})
