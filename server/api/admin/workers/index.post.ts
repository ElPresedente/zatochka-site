import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { parseNonNegativeInteger, parseTrimmedString } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const name = parseTrimmedString(body?.name, 'Имя сотрудника', { required: true, max: 200 })
  const role = parseTrimmedString(body?.role, 'Должность', { required: true, max: 200 })
  const photo = parseTrimmedString(body?.photo, 'Фото', { max: 500 })
  const sortOrder = parseNonNegativeInteger(body?.sortOrder ?? 0, 'Порядок сортировки', 1_000_000)

  const [row] = await db.insert(workers).values({ name, role, photo, sortOrder }).returning()
  return row
})
