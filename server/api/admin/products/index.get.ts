import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()

  const rows = await db.select().from(products)
    .orderBy(asc(products.sortOrder), asc(products.id))

  return rows.map(r => ({
    ...r,
    photos: JSON.parse(r.photos),
    specs: JSON.parse(r.specs),
  }))
})
