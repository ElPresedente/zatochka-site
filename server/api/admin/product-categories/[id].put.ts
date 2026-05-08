import { useDb } from '~/server/db'
import { productCategories } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { parseRouteId } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'категории')
  const body = await readBody(event)

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id))
  if (!existing) throw createError({ statusCode: 404, message: 'Категория не найдена' })
  if (existing.hidden) throw createError({ statusCode: 400, message: 'Системную категорию нельзя изменить' })

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name.trim()
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder

  const [row] = await db.update(productCategories).set(update).where(eq(productCategories.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
  return row
})
