import { useDb } from '~/server/db'
import { serviceCategories } from '~/server/db/schema'
import { parseNonNegativeInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const title = parseTrimmedString(body?.title, 'Название категории', { required: true, max: 200 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [row] = await db.insert(serviceCategories).values({ title, sortOrder }).returning()
  return row
})
