import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'
import { parseNonNegativeInteger, parsePositiveInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const categoryId = parsePositiveInteger(body?.categoryId, 'Категория')
  const name = parseTrimmedString(body?.name, 'Название услуги', { required: true, max: 200 })
  const price = parseTrimmedString(body?.price, 'Цена', { required: true, max: 100 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [row] = await db.insert(serviceItems).values({ categoryId, name, price, sortOrder }).returning()
  return row
})
