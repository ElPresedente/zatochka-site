import { and, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCategories, products } from '~/server/db/schema'
import {
  parseNonNegativeInteger,
  parsePositiveInteger,
  parseRouteId,
  parseTrimmedString,
} from '~/server/utils/validators'
import { parseProductPhotos, parseProductServices, parseProductSpecs } from '~/server/utils/json-shapes'

function parseCoverPosition(value: unknown): string {
  if (typeof value !== 'string') return 'center center'
  const parts = value.trim().split(/\s+/)
  // new format: "BSX BSY PX PY" (4 numbers)
  if (parts.length === 4 && parts.every(p => /^\d+(\.\d+)?$/.test(p))) return value.trim()
  // legacy format: named positions
  const LEGACY = ['left top', 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom']
  return LEGACY.includes(value.trim()) ? value.trim() : 'center center'
}

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'товара')
  const body = await readBody(event)

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = parseTrimmedString(body.name, 'Название', { required: true, max: 200 })
  if (body.categoryId !== undefined) {
    const categoryId = parsePositiveInteger(body.categoryId, 'Категория')
    const [cat] = await db.select({ id: productCategories.id })
      .from(productCategories)
      .where(and(eq(productCategories.id, categoryId), eq(productCategories.hidden, false)))
    if (!cat) throw createError({ statusCode: 400, message: 'Категория не найдена' })
    update.categoryId = categoryId
  }
  if (body.price !== undefined) update.price = parseNonNegativeInteger(body.price, 'Цена', 100_000_000)
  if (body.stock !== undefined) update.stock = parseNonNegativeInteger(body.stock, 'Остаток', 1_000_000)
  if (body.description !== undefined) update.description = parseTrimmedString(body.description, 'Описание', { max: 5000 })
  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos)) throw createError({ statusCode: 400, message: 'Некорректный формат фото' })
    update.photos = JSON.stringify(body.photos)
  }
  if (body.specs !== undefined) {
    if (!Array.isArray(body.specs)) throw createError({ statusCode: 400, message: 'Некорректный формат характеристик' })
    update.specs = JSON.stringify(body.specs)
  }
  if (body.services !== undefined) {
    if (!Array.isArray(body.services)) throw createError({ statusCode: 400, message: 'Некорректный формат услуг' })
    update.services = JSON.stringify(body.services)
  }
  if (body.active !== undefined) update.active = !!body.active
  if (body.sortOrder !== undefined) update.sortOrder = parseNonNegativeInteger(body.sortOrder, 'Порядок сортировки', 1_000_000)
  if (body.coverPosition !== undefined) {
    update.coverPosition = parseCoverPosition(body.coverPosition)
  }
  if (body.weightG !== undefined) update.weightG = parseNonNegativeInteger(body.weightG, 'Вес (г)', 100_000)
  if (body.lengthCm !== undefined) update.lengthCm = parseNonNegativeInteger(body.lengthCm, 'Длина (см)', 1000)
  if (body.widthCm !== undefined) update.widthCm = parseNonNegativeInteger(body.widthCm, 'Ширина (см)', 1000)
  if (body.heightCm !== undefined) update.heightCm = parseNonNegativeInteger(body.heightCm, 'Высота (см)', 1000)

  if (Object.keys(update).length === 0) throw createError({ statusCode: 400, message: 'Нет данных для сохранения' })

  const [existing] = body.photos !== undefined
    ? await db.select({ photos: products.photos }).from(products).where(eq(products.id, id))
    : [null]

  const [row] = await db.update(products).set(update).where(eq(products.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Товар не найден' })

  if (existing) {
    const { deleteUploadFiles } = await import('~/server/utils/uploads')
    const oldPhotos = parseProductPhotos(existing.photos)
    const newPhotos = parseProductPhotos(row.photos)
    const newSet = new Set(newPhotos)
    await deleteUploadFiles(oldPhotos.filter(url => !newSet.has(url)))
  }

  // Fetch category name for the response
  const [cat] = await db.select({ name: productCategories.name })
    .from(productCategories)
    .where(eq(productCategories.id, row.categoryId))

  return {
    ...row,
    category: cat?.name ?? '',
    photos: parseProductPhotos(row.photos),
    specs: parseProductSpecs(row.specs),
    services: parseProductServices(row.services),
    weightG: row.weightG,
    lengthCm: row.lengthCm,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
  }
})
