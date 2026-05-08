import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'услуги')
  const [row] = await db.delete(serviceItems).where(eq(serviceItems.id, id)).returning({ id: serviceItems.id })
  if (!row) throw createError({ statusCode: 404, message: 'Услуга не найдена' })
  return { ok: true }
})
