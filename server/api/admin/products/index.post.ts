import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)

  const [row] = await db.insert(products).values({
    name: body.name,
    category: body.category,
    price: Number(body.price),
    stock: Number(body.stock ?? 0),
    description: body.description ?? '',
    photos: JSON.stringify(body.photos ?? []),
    specs: JSON.stringify(body.specs ?? []),
    active: body.active ?? true,
    sortOrder: body.sortOrder ?? 0,
  }).returning()

  return { ...row, photos: JSON.parse(row.photos), specs: JSON.parse(row.specs) }
})
