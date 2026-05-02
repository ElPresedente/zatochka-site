import { desc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { orders } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()

  return db.select({
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
  }).from(orders).orderBy(desc(orders.createdAt), desc(orders.id))
})
