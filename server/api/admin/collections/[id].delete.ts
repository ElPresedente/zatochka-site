import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCollections } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'подборка')

  const deleted = await db
    .delete(productCollections)
    .where(eq(productCollections.id, id))
    .returning()

  if (deleted.length === 0) throw createError({ statusCode: 404, message: 'Подборка не найдена' })

  return { ok: true }
})
