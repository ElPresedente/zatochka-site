import { useDb } from '~/server/db'
import { productCategories } from '~/server/db/schema'
import { count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Name is required' })

  const [{ total }] = await db.select({ total: count() }).from(productCategories)
  const [row] = await db.insert(productCategories).values({
    name: body.name.trim(),
    sortOrder: body.sortOrder ?? total,
  }).returning()
  return row
})
