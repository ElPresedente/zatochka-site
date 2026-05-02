import { useDb } from '~/server/db'
import { productCategories } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(productCategories).where(eq(productCategories.id, id))
  return { ok: true }
})
