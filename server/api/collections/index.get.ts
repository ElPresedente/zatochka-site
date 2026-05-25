import { asc, and, eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCollections, productCollectionItems, products, productCategories } from '~/server/db/schema'
import { parseProductPhotos, parseProductServices, parseProductSpecs } from '~/server/utils/json-shapes'

export default defineEventHandler(async () => {
  const db = useDb()

  const cols = await db
    .select()
    .from(productCollections)
    .where(eq(productCollections.active, true))
    .orderBy(asc(productCollections.sortOrder))

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

  const productIds = [...new Set(items.map(i => i.productId))]
  if (productIds.length === 0) return cols.map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, active: c.active, products: [] }))

  const prods = await db
    .select({
      id: products.id,
      categoryId: products.categoryId,
      category: productCategories.name,
      name: products.name,
      price: products.price,
      stock: products.stock,
      description: products.description,
      photos: products.photos,
      specs: products.specs,
      services: products.services,
      active: products.active,
      sortOrder: products.sortOrder,
      coverPosition: products.coverPosition,
    })
    .from(products)
    .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(and(inArray(products.id, productIds), eq(products.active, true)))

  const prodMap = new Map(prods.map(p => [p.id, p]))

  return cols.map(c => {
    const colItems = items.filter(i => i.collectionId === c.id)
    const colProducts = colItems
      .filter(i => prodMap.has(i.productId))
      .map(i => {
        const p = prodMap.get(i.productId)!
        return {
          ...p,
          photos: parseProductPhotos(p.photos),
          specs: parseProductSpecs(p.specs),
          services: parseProductServices(p.services),
        }
      })
    return {
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
      active: c.active,
      products: colProducts,
    }
  })
})
