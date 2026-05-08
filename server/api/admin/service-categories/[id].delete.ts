import { useDb } from '~/server/db'
import { serviceCategories } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'категории')
  const [row] = await db.delete(serviceCategories).where(eq(serviceCategories.id, id)).returning({ id: serviceCategories.id })
  if (!row) throw createError({ statusCode: 404, message: 'Категория услуг не найдена' })
  return { ok: true }
})
