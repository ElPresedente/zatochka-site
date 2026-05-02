import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))

  const [row] = await db.delete(products).where(eq(products.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Product not found' })

  return { ok: true }
})
