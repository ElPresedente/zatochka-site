import { useDb } from '~/server/db'
import { admins } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  const userId = Number(getRouterParam(event, 'id'))
  if (!userId) throw createError({ statusCode: 400, message: 'Неверный id' })

  const db = useDb()
  await db.insert(admins).values({ userId }).onConflictDoNothing()
  return { ok: true }
})
