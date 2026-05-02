import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.select().from(siteSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
})
