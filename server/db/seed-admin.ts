import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const db = drizzle(pool, { schema })

async function seedAdmin() {
  const adminPhone = process.env.ADMIN_PHONE
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPhone || !adminPassword) {
    console.error('ADMIN_PHONE and ADMIN_PASSWORD must be set in .env')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)
  const [adminUser] = await db.insert(schema.users).values({
    lastName: 'Администратор',
    firstName: 'Главный',
    phone: adminPhone,
    passwordHash,
  }).onConflictDoUpdate({
    target: schema.users.phone,
    set: { passwordHash },
  }).returning()

  await db.insert(schema.admins).values({ userId: adminUser.id }).onConflictDoNothing()
  console.log(`✓ Admin created/updated: ${adminPhone}`)
  await pool.end()
}

seedAdmin().catch((err) => {
  console.error(err)
  process.exit(1)
})
