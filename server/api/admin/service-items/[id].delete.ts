import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(serviceItems).where(eq(serviceItems.id, id))
  return { ok: true }
})
