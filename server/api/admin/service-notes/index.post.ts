import { useDb } from '~/server/db'
import { serviceNotes } from '~/server/db/schema'
import { parseNonNegativeInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const content = parseTrimmedString(body?.content, 'Текст примечания', { required: true, max: 1000 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [row] = await db.insert(serviceNotes).values({ content, sortOrder }).returning()
  return row
})
