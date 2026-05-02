import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.role !== undefined) update.role = body.role
  if (body.photo !== undefined) update.photo = body.photo
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder
  const [row] = await db.update(workers).set(update).where(eq(workers.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })
  return row
})
