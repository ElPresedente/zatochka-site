import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCategories, products } from '~/server/db/schema'
import { safeJsonParse } from '~/server/utils/validators'

export default defineEventHandler(async () => {
  const db = useDb()

  const rows = await db
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
      createdAt: products.createdAt,
    })
    .from(products)
    .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
    .orderBy(asc(products.sortOrder), asc(products.id))

  return rows.map(r => ({
    ...r,
    photos: safeJsonParse<string[]>(r.photos, []),
    specs: safeJsonParse<unknown[]>(r.specs, []),
    services: safeJsonParse<unknown[]>(r.services, []),
  }))
})
