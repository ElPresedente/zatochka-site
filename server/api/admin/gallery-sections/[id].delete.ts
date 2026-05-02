import { useDb } from '~/server/db'
import { gallerySections } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  await db.delete(gallerySections).where(eq(gallerySections.id, id))
  return { ok: true }
})
