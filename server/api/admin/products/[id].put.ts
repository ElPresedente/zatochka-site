import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import {
  parseNonNegativeInteger,
  parseRouteId,
  parseTrimmedString,
  safeJsonParse,
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'товара')
  const body = await readBody(event)

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = parseTrimmedString(body.name, 'Название', { required: true, max: 200 })
  if (body.category !== undefined) update.category = parseTrimmedString(body.category, 'Категория', { required: true, max: 100 })
  if (body.price !== undefined) update.price = parseNonNegativeInteger(body.price, 'Цена', 100_000_000)
  if (body.stock !== undefined) update.stock = parseNonNegativeInteger(body.stock, 'Остаток', 1_000_000)
  if (body.description !== undefined) update.description = parseTrimmedString(body.description, 'Описание', { max: 5000 })
  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos)) {
      throw createError({ statusCode: 400, message: 'Некорректный формат фото' })
    }
    update.photos = JSON.stringify(body.photos)
  }
  if (body.specs !== undefined) {
    if (!Array.isArray(body.specs)) {
      throw createError({ statusCode: 400, message: 'Некорректный формат характеристик' })
    }
    update.specs = JSON.stringify(body.specs)
  }
  if (body.services !== undefined) {
    if (!Array.isArray(body.services)) {
      throw createError({ statusCode: 400, message: 'Некорректный формат услуг' })
    }
    update.services = JSON.stringify(body.services)
  }
  if (body.active !== undefined) update.active = !!body.active
  if (body.sortOrder !== undefined) update.sortOrder = parseNonNegativeInteger(body.sortOrder, 'Порядок сортировки', 1_000_000)

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })
  }

  const [row] = await db.update(products).set(update).where(eq(products.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Товар не найден' })

  return {
    ...row,
    photos: safeJsonParse<string[]>(row.photos, []),
    specs: safeJsonParse<unknown[]>(row.specs, []),
    services: safeJsonParse<unknown[]>(row.services, []),
  }
})
