import { useDb } from '~/server/db'
import { serviceNotes } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'примечания')
  const body = await readBody(event)
  const [row] = await db.update(serviceNotes).set({
    content: body.content,
    sortOrder: body.sortOrder,
  }).where(eq(serviceNotes.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Примечание не найдено' })
  return row
})
