import { useDb } from '~/server/db'
import { serviceCategories } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'категории услуг')
  const body = await readBody(event)
  const [row] = await db.update(serviceCategories).set({
    title: body.title,
    sortOrder: body.sortOrder,
  }).where(eq(serviceCategories.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Категория услуг не найдена' })
  return row
})
