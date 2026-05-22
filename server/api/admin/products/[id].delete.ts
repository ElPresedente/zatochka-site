import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { products } from '~/server/db/schema'
import { parseRouteId } from '~/server/utils/validators'
import { parseProductPhotos } from '~/server/utils/json-shapes'
import { deleteUploadFiles } from '~/server/utils/uploads'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = parseRouteId(getRouterParam(event, 'id'), 'товара')

  const [row] = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id, photos: products.photos })
  if (!row) throw createError({ statusCode: 404, message: 'Товар не найден' })

  await deleteUploadFiles(parseProductPhotos(row.photos))

  return { ok: true }
})
