import { useDb } from '~/server/db'
import { serviceItems } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const [row] = await db.insert(serviceItems).values({
    categoryId: Number(body.categoryId),
    name: body.name,
    price: body.price,
    sortOrder: body.sortOrder ?? 0,
  }).returning()
  return row
})
