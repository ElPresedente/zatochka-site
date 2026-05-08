import { useDb } from '~/server/db'
import { galleryImages } from '~/server/db/schema'
import { parseNonNegativeInteger, parsePositiveInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const sectionId = parsePositiveInteger(body?.sectionId, 'Раздел галереи')
  const src = parseTrimmedString(body?.src, 'Изображение', { required: true, max: 500 })
  const label = parseTrimmedString(body?.label, 'Подпись', { max: 200 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [row] = await db.insert(galleryImages).values({ sectionId, src, label, sortOrder }).returning()
  return row
})
