import 'dotenv/config'
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

// Check applied migrations
const migs = await client.query('SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id ASC')
console.log('Applied migrations in DB:')
migs.rows.forEach((r: any) => console.log(' ', r.id, r.hash?.slice(0, 8)))

// Check if columns exist
const cols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'products'
  ORDER BY ordinal_position
`)
console.log('\nproducts columns:', cols.rows.map((r: any) => r.column_name).join(', '))

const ocols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'orders'
  ORDER BY ordinal_position
`)
console.log('\norders columns:', ocols.rows.map((r: any) => r.column_name).join(', '))

await client.end()
