import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(galleryImages).where(eq(galleryImages.id, id))
  return { ok: true }
})
