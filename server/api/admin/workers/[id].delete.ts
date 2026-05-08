import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'
import { deleteUploadFile } from '~/server/utils/uploads'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'сотрудника')
  const [row] = await db.delete(workers).where(eq(workers.id, id)).returning({ id: workers.id, photo: workers.photo })
  if (!row) throw createError({ statusCode: 404, message: 'Сотрудник не найден' })
  await deleteUploadFile(row.photo)
  return { ok: true }
})
