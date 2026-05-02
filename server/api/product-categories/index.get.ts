import { useDb } from '~/server/db'
import { productCategories } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(productCategories).orderBy(asc(productCategories.sortOrder), asc(productCategories.id))
})
