import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { items } = await readBody<{ items: { id: number; sortOrder: number }[] }>(event)
  if (!Array.isArray(items) || items.length === 0) return { ok: true }
  const db = useDb()
  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of items) {
      await tx.update(serviceItems).set({ sortOrder }).where(eq(serviceItems.id, id))
    }
  })
  return { ok: true }
})
