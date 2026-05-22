import { and, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { productCategories, products } from '~/server/db/schema'
import { parseNonNegativeInteger, parsePositiveInteger, parseTrimmedString } from '~/server/utils/validators'
import { parseProductPhotos, parseProductServices, parseProductSpecs } from '~/server/utils/json-shapes'

function parseCoverPosition(value: unknown): string {
  if (typeof value !== 'string') return 'center center'
  const parts = value.trim().split(/\s+/)
  if (parts.length === 4 && parts.every(p => /^\d+(\.\d+)?$/.test(p))) return value.trim()
  const LEGACY = ['left top', 'center top', 'right top', 'left center', 'center center', 'right center', 'left bottom', 'center bottom', 'right bottom']
  return LEGACY.includes(value.trim()) ? value.trim() : 'center center'
}

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const name = parseTrimmedString(body?.name, 'Название', { required: true, max: 200 })
  const categoryId = parsePositiveInteger(body?.categoryId, 'Категория')
  const description = parseTrimmedString(body?.description, 'Описание', { max: 5000 })
  const price = parseNonNegativeInteger(body?.price ?? 0, 'Цена', 100_000_000)
  const stock = parseNonNegativeInteger(body?.stock ?? 0, 'Остаток', 1_000_000)
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [category] = await db.select({ id: productCategories.id, name: productCategories.name })
    .from(productCategories)
    .where(and(eq(productCategories.id, categoryId), eq(productCategories.hidden, false)))
  if (!category) throw createError({ statusCode: 400, message: 'Категория не найдена' })

  const photos = Array.isArray(body?.photos) ? body.photos : []
  const specs = Array.isArray(body?.specs) ? body.specs : []
  const services = Array.isArray(body?.services) ? body.services : []
  const active = body?.active !== false
  const coverPosition = parseCoverPosition(body?.coverPosition)

  const [row] = await db.insert(products).values({
    categoryId,
    name,
    price,
    stock,
    description,
    photos: JSON.stringify(photos),
    specs: JSON.stringify(specs),
    services: JSON.stringify(services),
    active,
    sortOrder,
    coverPosition,
  }).returning()

  return {
    ...row,
    category: category.name,
    photos: parseProductPhotos(row.photos),
    specs: parseProductSpecs(row.specs),
    services: parseProductServices(row.services),
  }
})
