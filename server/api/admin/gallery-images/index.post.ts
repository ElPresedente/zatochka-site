import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const [row] = await db.insert(galleryImages).values({
    sectionId: Number(body.sectionId),
    src: body.src,
    label: body.label ?? '',
    sortOrder: body.sortOrder ?? 0,
  }).returning()
  return row
})
