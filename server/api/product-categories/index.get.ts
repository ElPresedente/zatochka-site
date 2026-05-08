import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCategories } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select()
    .from(productCategories)
    .where(eq(productCategories.hidden, false))
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.id))
})
