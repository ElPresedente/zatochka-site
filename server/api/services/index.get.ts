import { useDb } from '~/server/db'
import { serviceCategories, serviceItems, serviceNotes } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()

  const [categories, notes] = await Promise.all([
    db.query.serviceCategories.findMany({
      orderBy: asc(serviceCategories.sortOrder),
      with: {
        items: { orderBy: asc(serviceItems.sortOrder) },
      },
    }),
    db.query.serviceNotes.findMany({
      orderBy: asc(serviceNotes.sortOrder),
    }),
  ])

  return { categories, notes }
})
