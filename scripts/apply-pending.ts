/**
 * Применяет только реально отсутствующие миграции по хэшу,
 * без попытки переприменить уже выполненные.
 */
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

let applied = 0
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
  const hash = crypto.createHash('sha256').update(content).digest('hex')

  if (appliedHashes.has(hash)) {
    console.log(`  ✅ skip   ${file}`)
    continue
  }

  console.log(`  ⏳ apply  ${file} ...`)
  try {
    await client.query('BEGIN')
    await client.query(content)
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, Date.now()],
    )
    await client.query('COMMIT')
    console.log(`  ✅ done   ${file}`)
    applied++
  }
  catch (err: any) {
    await client.query('ROLLBACK')
    console.error(`  ❌ FAIL   ${file}: ${err.message}`)
    process.exit(1)
  }
}

console.log(`\nApplied ${applied} migration(s).`)
await client.end()
