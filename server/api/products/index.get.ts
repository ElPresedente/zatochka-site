import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import { asc, eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)

  const conditions = []
  if (query.activeOnly !== 'false') {
    conditions.push(eq(products.active, true))
  }

  const rows = await db.select().from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(products.sortOrder), asc(products.id))

  return rows.map(r => ({
    ...r,
    photos: JSON.parse(r.photos),
    specs: JSON.parse(r.specs),
  }))
})
