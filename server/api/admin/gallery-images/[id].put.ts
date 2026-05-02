import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const update: Record<string, unknown> = {}
  if (body.src !== undefined) update.src = body.src
  if (body.label !== undefined) update.label = body.label
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder
  if (body.sectionId !== undefined) update.sectionId = Number(body.sectionId)
  const [row] = await db.update(galleryImages).set(update).where(eq(galleryImages.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
