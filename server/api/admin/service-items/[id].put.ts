import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.price !== undefined) update.price = body.price
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder
  if (body.categoryId !== undefined) update.categoryId = Number(body.categoryId)
  const [row] = await db.update(serviceItems).set(update).where(eq(serviceItems.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
