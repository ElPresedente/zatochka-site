import { useDb } from '~/server/db'
import { users, admins } from '~/server/db/schema'
import { desc, eq } from 'drizzle-orm'
import { parseNonNegativeInteger } from '~/server/utils/validators'

const DEFAULT_LIMIT = 200
const MAX_LIMIT = 1000

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = query.limit !== undefined
    ? parseNonNegativeInteger(query.limit, 'limit', MAX_LIMIT) || DEFAULT_LIMIT
    : DEFAULT_LIMIT
  const offset = query.offset !== undefined
    ? parseNonNegativeInteger(query.offset, 'offset')
    : 0

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
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)

  return rows.map(r => ({ ...r, isAdmin: r.adminUserId !== null }))
})
