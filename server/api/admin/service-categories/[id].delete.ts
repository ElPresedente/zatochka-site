import { useDb } from '~/server/db'
import { serviceCategories } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(serviceCategories).where(eq(serviceCategories.id, id))
  return { ok: true }
})
