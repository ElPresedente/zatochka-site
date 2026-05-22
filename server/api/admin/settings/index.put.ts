import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event) as Record<string, string>

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      db.insert(siteSettings).values({ key, value })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value } })
    )
  )

  return { ok: true }
})
