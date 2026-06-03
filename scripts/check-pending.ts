import 'dotenv/config'
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '../server/db/migrations')

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const { rows } = await client.query<{ hash: string }>(
  'SELECT hash FROM drizzle.__drizzle_migrations',
)
const appliedHashes = new Set(rows.map(r => r.hash))

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()

console.log('File → hash → status')
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
  const hash = crypto.createHash('sha256').update(content).digest('hex')
  const shortHash = hash.slice(0, 8)
  const status = appliedHashes.has(hash) ? '✅ applied' : '⏳ PENDING'
  console.log(`  ${file}  ${shortHash}  ${status}`)
}

await client.end()
