import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'
import { deleteUploadFile } from '~/server/utils/uploads'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'изображения')
  const body = await readBody(event)

  const [existing] = await db.select({ src: galleryImages.src }).from(galleryImages).where(eq(galleryImages.id, id))
  if (!existing) throw createError({ statusCode: 404, message: 'Изображение не найдено' })

  const update: Record<string, unknown> = {}
  if (body.src !== undefined) update.src = body.src
  if (body.label !== undefined) update.label = body.label
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder
  if (body.sectionId !== undefined) update.sectionId = Number(body.sectionId)

  const [row] = await db.update(galleryImages).set(update).where(eq(galleryImages.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Изображение не найдено' })

  if (body.src !== undefined && body.src !== existing.src) {
    await deleteUploadFile(existing.src)
  }

  return row
})
