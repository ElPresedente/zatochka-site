import { useDb } from '~/server/db'
import { serviceNotes } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const [row] = await db.update(serviceNotes).set({
    content: body.content,
    sortOrder: body.sortOrder,
  }).where(eq(serviceNotes.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
