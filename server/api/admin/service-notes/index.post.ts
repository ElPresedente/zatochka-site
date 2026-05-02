import { useDb } from '~/server/db'
import { serviceNotes } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const [row] = await db.insert(serviceNotes).values({
    content: body.content,
    sortOrder: body.sortOrder ?? 0,
  }).returning()
  return row
})
