import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'
import { deleteUploadFile } from '~/server/utils/uploads'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'сотрудника')
  const body = await readBody(event)

  const [existing] = body.photo !== undefined
    ? await db.select({ photo: workers.photo }).from(workers).where(eq(workers.id, id))
    : [null]
  if (body.photo !== undefined && !existing) throw createError({ statusCode: 404, message: 'Сотрудник не найден' })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.role !== undefined) update.role = body.role
  if (body.photo !== undefined) update.photo = body.photo
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

  const [row] = await db.update(workers).set(update).where(eq(workers.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Сотрудник не найден' })

  if (existing && body.photo !== existing.photo) {
    await deleteUploadFile(existing.photo)
  }

  return row
})
