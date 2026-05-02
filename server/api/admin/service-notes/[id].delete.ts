import { useDb } from '~/server/db'
import { serviceNotes } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(serviceNotes).where(eq(serviceNotes.id, id))
  return { ok: true }
})
