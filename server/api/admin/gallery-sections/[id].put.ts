import { useDb } from '~/server/db'
import { gallerySections } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const [row] = await db.update(gallerySections).set({
    title: body.title,
    sortOrder: body.sortOrder,
  }).where(eq(gallerySections.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
