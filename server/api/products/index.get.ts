import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import { asc, eq } from 'drizzle-orm'
import { safeJsonParse } from '~/server/utils/validators'

export default defineEventHandler(async () => {
  const db = useDb()

  const rows = await db.select().from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.sortOrder), asc(products.id))

  return rows.map(r => ({
    ...r,
    photos: safeJsonParse<string[]>(r.photos, []),
    specs: safeJsonParse<unknown[]>(r.specs, []),
  }))
})
