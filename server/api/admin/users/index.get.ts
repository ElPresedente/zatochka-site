import { useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db
    .select({
      id: users.id,
      lastName: users.lastName,
      firstName: users.firstName,
      phone: users.phone,
      consentGivenAt: users.consentGivenAt,
      createdAt: users.createdAt,
      adminUserId: admins.userId,
    })
    .from(users)
    .leftJoin(admins, eq(admins.userId, users.id))
    .orderBy(users.createdAt)

  return rows.map(r => ({ ...r, isAdmin: r.adminUserId !== null }))
})
