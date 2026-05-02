import { useDb } from '~/server/db'
import { products, gallerySections, galleryImages, serviceCategories, serviceItems, workers, orders } from '~/server/db/schema'
import { count, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()

  const [[productsTotal], [productsActive], [ordersTotal], [ordersCreated], [sectionsTotal], [imagesTotal], [categoriesTotal], [itemsTotal], [workersTotal]] = await Promise.all([
    db.select({ count: count() }).from(products),
    db.select({ count: count() }).from(products).where(eq(products.active, true)),
    db.select({ count: count() }).from(orders),
    db.select({ count: count() }).from(orders).where(eq(orders.status, 'created')),
    db.select({ count: count() }).from(gallerySections),
    db.select({ count: count() }).from(galleryImages),
    db.select({ count: count() }).from(serviceCategories),
    db.select({ count: count() }).from(serviceItems),
    db.select({ count: count() }).from(workers),
  ])

  return {
    products: { total: productsTotal.count, active: productsActive.count },
    orders: { total: ordersTotal.count, created: ordersCreated.count },
    gallery: { sections: sectionsTotal.count, images: imagesTotal.count },
    services: { categories: categoriesTotal.count, items: itemsTotal.count },
    workers: workersTotal.count,
  }
})
