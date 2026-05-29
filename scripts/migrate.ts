import 'dotenv/config'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const migrationsFolder = join(__dirname, '../server/db/migrations')

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const db = drizzle(client)

console.log('Running migrations...')
await migrate(db, { migrationsFolder })
console.log('Done.')

await client.end()
