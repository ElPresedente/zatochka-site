import { useDb } from '~/server/db'
import { gallerySections } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const [row] = await db.insert(gallerySections).values({
    title: body.title,
    sortOrder: body.sortOrder ?? 0,
  }).returning()
  return row
})
