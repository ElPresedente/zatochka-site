import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import { parseNonNegativeInteger, parseTrimmedString, safeJsonParse } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const name = parseTrimmedString(body?.name, 'Название', { required: true, max: 200 })
  const category = parseTrimmedString(body?.category, 'Категория', { required: true, max: 100 })
  const description = parseTrimmedString(body?.description, 'Описание', { max: 5000 })
  const price = parseNonNegativeInteger(body?.price ?? 0, 'Цена', 100_000_000)
  const stock = parseNonNegativeInteger(body?.stock ?? 0, 'Остаток', 1_000_000)
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const photos = Array.isArray(body?.photos) ? body.photos : []
  const specs = Array.isArray(body?.specs) ? body.specs : []
  const active = body?.active !== false

  const [row] = await db.insert(products).values({
    name,
    category,
    price,
    stock,
    description,
    photos: JSON.stringify(photos),
    specs: JSON.stringify(specs),
    active,
    sortOrder,
  }).returning()

  return {
    ...row,
    photos: safeJsonParse<string[]>(row.photos, []),
    specs: safeJsonParse<unknown[]>(row.specs, []),
  }
})
