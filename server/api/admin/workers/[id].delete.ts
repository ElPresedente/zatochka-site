import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(workers).where(eq(workers.id, id))
  return { ok: true }
})
