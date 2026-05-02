import { useDb } from '~/server/db'
import { products, gallerySections, galleryImages, serviceCategories, serviceItems, workers } from '~/server/db/schema'
import { count, eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()

  const [[productsTotal], [productsActive], [sectionsTotal], [imagesTotal], [categoriesTotal], [itemsTotal], [workersTotal]] = await Promise.all([
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(products).where(eq(products.active, true)),
    db.select({ count: count() }).from(gallerySections),
    db.select({ count: count() }).from(galleryImages),
    db.select({ count: count() }).from(serviceCategories),
    db.select({ count: count() }).from(serviceItems),
    db.select({ count: count() }).from(workers),
  ])

  return {
    products: { total: productsTotal.count, active: productsActive.count },
    gallery: { sections: sectionsTotal.count, images: imagesTotal.count },
    services: { categories: categoriesTotal.count, items: itemsTotal.count },
    workers: workersTotal.count,
  }
})
