import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const items: unknown[] = body?.items

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, message: 'items обязателен' })
  }

  const db = useDb()
  await db.transaction(async (tx) => {
    for (const item of items) {
      if (
        typeof item !== 'object' || item === null
        || !Number.isInteger((item as any).id) || (item as any).id <= 0
        || !Number.isInteger((item as any).sortOrder) || (item as any).sortOrder < 0
      ) continue
      await tx
        .update(products)
        .set({ sortOrder: (item as any).sortOrder })
        .where(eq(products.id, (item as any).id))
    }
  })

  return { ok: true }
})
