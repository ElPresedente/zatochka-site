import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const [row] = await db.insert(workers).values({
    name: body.name,
    role: body.role,
    photo: body.photo ?? '',
    sortOrder: body.sortOrder ?? 0,
  }).returning()
  return row
})
