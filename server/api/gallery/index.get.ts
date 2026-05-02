import { useDb } from '~/server/db'
import { gallerySections, galleryImages } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()

  return db.query.gallerySections.findMany({
    orderBy: asc(gallerySections.sortOrder),
    with: {
      images: { orderBy: asc(galleryImages.sortOrder) },
    },
  })
})
