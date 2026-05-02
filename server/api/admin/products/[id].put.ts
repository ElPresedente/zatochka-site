import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Некорректный ID товара' })
  }

  function parseNonNegativeInteger(value: unknown, fieldName: string) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw createError({ statusCode: 400, message: `${fieldName} должно быть целым числом не меньше 0` })
    }
    return parsed
  }

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.category !== undefined) update.category = body.category
  if (body.price !== undefined) update.price = parseNonNegativeInteger(body.price, 'Цена')
  if (body.stock !== undefined) update.stock = parseNonNegativeInteger(body.stock, 'Остаток')
  if (body.description !== undefined) update.description = body.description
  if (body.photos !== undefined) update.photos = JSON.stringify(body.photos)
  if (body.specs !== undefined) update.specs = JSON.stringify(body.specs)
  if (body.active !== undefined) update.active = body.active
  if (body.sortOrder !== undefined) update.sortOrder = parseNonNegativeInteger(body.sortOrder, 'Порядок сортировки')

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const [row] = await db.update(products).set(update).where(eq(products.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Product not found' })

  return { ...row, photos: JSON.parse(row.photos), specs: JSON.parse(row.specs) }
})
