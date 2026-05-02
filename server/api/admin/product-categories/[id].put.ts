import { useDb } from '~/server/db'
import { productCategories, products } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id))
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

  const [row] = await db.update(productCategories).set(update).where(eq(productCategories.id, id)).returning()

  // Если переименовали — обновить category во всех товарах
  if (body.name !== undefined && body.name.trim() !== existing.name) {
    await db.update(products).set({ category: body.name.trim() }).where(eq(products.category, existing.name))
  }

  return row
})
