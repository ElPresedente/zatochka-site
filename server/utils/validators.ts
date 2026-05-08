import { createError } from 'h3'

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError({ statusCode: 400, message: `${fieldName} должно быть положительным целым числом` })
  }
  return parsed
}

export function parseNonNegativeInteger(value: unknown, fieldName: string, max?: number): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createError({ statusCode: 400, message: `${fieldName} должно быть целым числом не меньше 0` })
  }
  if (max !== undefined && parsed > max) {
    throw createError({ statusCode: 400, message: `${fieldName} превышает допустимое значение` })
  }
  return parsed
}

interface StringOptions {
  min?: number
  max?: number
  required?: boolean
}

export function parseTrimmedString(value: unknown, fieldName: string, opts: StringOptions = {}): string {
  if (value === undefined || value === null) {
    if (opts.required) {
      throw createError({ statusCode: 400, message: `${fieldName} обязательно` })
    }
    return ''
  }
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `${fieldName} должно быть строкой` })
  }
  const trimmed = value.trim()
  if (opts.required && trimmed.length === 0) {
    throw createError({ statusCode: 400, message: `${fieldName} обязательно` })
  }
  if (opts.min !== undefined && trimmed.length < opts.min) {
    throw createError({ statusCode: 400, message: `${fieldName} слишком короткое` })
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw createError({ statusCode: 400, message: `${fieldName} слишком длинное` })
  }
  return trimmed
}

/**
 * Normalizes a Russian phone number to 10 digits (without country code).
 * Accepts: +79001234567, 79001234567, 89001234567, 9001234567,
 *          spaces/dashes/parens are stripped before parsing.
 * Returns null if the input doesn't match a valid Russian mobile format.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    return digits.slice(1)
  }
  if (digits.length === 10) {
    return digits
  }
  return null
}

export function parseRouteId(value: string | undefined, entity = 'записи'): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError({ statusCode: 400, message: `Некорректный ID ${entity}` })
  }
  return parsed
}
