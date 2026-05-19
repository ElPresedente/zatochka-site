import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

const DB_NETWORK_ERRORS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'])
const DB_SQLSTATE_ERRORS = new Set(['08000', '08003', '08006', '57P01'])

function extractErrorCode(e: unknown): string | undefined {
  return (e as any)?.code
}

export function handleDbConnectionError(e: unknown): void {
  if (!(e instanceof Error)) return
  // Drizzle wraps the original pg/network error in .cause
  const code = extractErrorCode(e) ?? extractErrorCode((e as any).cause)
  if (code && (DB_NETWORK_ERRORS.has(code) || DB_SQLSTATE_ERRORS.has(code))) {
    throw createError({ statusCode: 503, message: 'Нет соединения с базой данных. Попробуйте позже.' })
  }
}

export function useDb() {
  if (_db) return _db

  const config = useRuntimeConfig()
  const url = config.databaseUrl

  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({ connectionString: url })
  _db = drizzle(pool, { schema })

  process.once('SIGTERM', () => pool.end())
  process.once('SIGINT', () => pool.end())

  return _db
}
