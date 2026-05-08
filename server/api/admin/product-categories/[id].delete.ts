import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCategories, products } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'категории')

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id))
  if (!existing) throw createError({ statusCode: 404, message: 'Категория не найдена' })
  if (existing.hidden) throw createError({ statusCode: 400, message: 'Системную категорию нельзя удалить' })

  await db.transaction(async (tx) => {
    // Move products to "Без категории" before deleting
    const [uncategorized] = await tx.select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.hidden, true))

    if (uncategorized) {
      await tx.update(products).set({ categoryId: uncategorized.id }).where(eq(products.categoryId, id))
    }

    await tx.delete(productCategories).where(eq(productCategories.id, id))
  })

  return { ok: true }
})
