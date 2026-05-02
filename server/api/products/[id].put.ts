import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.category !== undefined) update.category = body.category
  if (body.price !== undefined) update.price = Number(body.price)
  if (body.stock !== undefined) update.stock = Number(body.stock)
  if (body.description !== undefined) update.description = body.description
  if (body.photos !== undefined) update.photos = JSON.stringify(body.photos)
  if (body.specs !== undefined) update.specs = JSON.stringify(body.specs)
  if (body.active !== undefined) update.active = body.active
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

  const [row] = await db.update(products).set(update).where(eq(products.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Product not found' })

  return { ...row, photos: JSON.parse(row.photos), specs: JSON.parse(row.specs) }
})
