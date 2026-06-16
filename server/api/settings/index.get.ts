import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'
import { isPrivateSettingKey } from '~/server/utils/settings-keys'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.select().from(siteSettings)
  // Приватные ключи (префикс private_) не отдаём публично.
  return Object.fromEntries(
    rows.filter((r) => !isPrivateSettingKey(r.key)).map((r) => [r.key, r.value])
  )
})
