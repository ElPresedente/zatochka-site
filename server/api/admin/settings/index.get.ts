import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'

// Под admin-auth (всё /api/admin/**). Возвращает все настройки, включая приватные
// (префикс private_), которых нет в публичном GET /api/settings — чтобы форма
// в админке могла прочитать и отредактировать их.
export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.select().from(siteSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
})
