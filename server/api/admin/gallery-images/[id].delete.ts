import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'
import { deleteUploadFile } from '~/server/utils/uploads'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'изображения')
  const [row] = await db.delete(galleryImages).where(eq(galleryImages.id, id)).returning({ id: galleryImages.id, src: galleryImages.src })
  if (!row) throw createError({ statusCode: 404, message: 'Изображение не найдено' })
  await deleteUploadFile(row.src)
  return { ok: true }
})
