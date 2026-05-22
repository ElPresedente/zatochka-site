import { useDb } from '~/server/db'
import { gallerySections } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'раздела галереи')
  const [row] = await db.delete(gallerySections).where(eq(gallerySections.id, id)).returning({ id: gallerySections.id })
  if (!row) throw createError({ statusCode: 404, message: 'Раздел галереи не найден' })
  return { ok: true }
})
