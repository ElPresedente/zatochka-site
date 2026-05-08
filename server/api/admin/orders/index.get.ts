import { count, desc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders, orderStatuses } from '~/server/db/schema'
import type { OrderStatus } from '~/server/db/schema'

const PAGE_LIMIT = 50

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const rawPage = Number(query.page)
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1

  const rawStatus = query.status
  const status = typeof rawStatus === 'string' && (orderStatuses as readonly string[]).includes(rawStatus)
    ? rawStatus as OrderStatus
    : null

  const db = useDb()
  const where = status ? eq(orders.status, status) : undefined

  const [[{ total }], rows] = await Promise.all([
    db.select({ total: count() }).from(orders).where(where),
    db.select({
      id: orders.id,
      userId: orders.userId,
      customerFirstName: orders.customerFirstName,
      customerLastName: orders.customerLastName,
      customerPhone: orders.customerPhone,
      userComment: orders.userComment,
      sellerComment: orders.sellerComment,
      status: orders.status,
      totalAmount: orders.totalAmount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    }).from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(PAGE_LIMIT)
      .offset((page - 1) * PAGE_LIMIT),
  ])

  return {
    orders: rows,
    total,
    page,
    pageCount: Math.ceil(total / PAGE_LIMIT) || 1,
  }
})
