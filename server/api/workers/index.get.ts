import { useDb } from '~/server/db'
import { workers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(workers).orderBy(asc(workers.sortOrder))
})
