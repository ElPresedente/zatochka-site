import { useStorage } from 'nitropack/runtime'
import { createError } from 'h3'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  key: string
  windowMs: number
  max: number
  message?: string
}

const STORAGE_BASE = 'rate-limit'

function storage() {
  return useStorage<RateLimitEntry>(STORAGE_BASE)
}

export async function assertRateLimit(opts: RateLimitOptions) {
  const now = Date.now()
  const entry = await storage().getItem(opts.key)

  if (!entry || entry.resetAt <= now) return

  if (entry.count >= opts.max) {
    throw createError({
      statusCode: 429,
      message: opts.message ?? 'Слишком много запросов. Попробуйте позже.',
    })
  }
}

export async function recordRateLimitHit(opts: RateLimitOptions) {
  const now = Date.now()
  const entry = await storage().getItem(opts.key)

  if (!entry || entry.resetAt <= now) {
    await storage().setItem(opts.key, { count: 1, resetAt: now + opts.windowMs })
    return
  }

  await storage().setItem(opts.key, {
    count: entry.count + 1,
    resetAt: entry.resetAt,
  })
}

export async function clearRateLimit(key: string) {
  await storage().removeItem(key)
}
