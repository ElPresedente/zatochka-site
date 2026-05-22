import { safeJsonParse } from './validators'

/**
 * Парсеры с проверкой формы для JSON-полей, хранящихся в text-колонках.
 * Все возвращают валидные значения по схеме либо безопасный fallback —
 * никогда не бросают, чтобы битые строки в БД не валили endpoint.
 */

export interface ProductService {
  id: string
  name: string
  price: number
}

export interface ProductSpec {
  key: string
  value: string
}

export interface OrderItemService {
  name: string
  price: number
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function parseProductPhotos(value: unknown): string[] {
  const raw = safeJsonParse<unknown>(value, [])
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is string => typeof s === 'string')
}

export function parseProductSpecs(value: unknown): ProductSpec[] {
  const raw = safeJsonParse<unknown>(value, [])
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!isObject(item)) return []
    const key = typeof item.key === 'string' ? item.key : ''
    const valueStr = typeof item.value === 'string' ? item.value : ''
    if (!key && !valueStr) return []
    return [{ key, value: valueStr }]
  })
}

export function parseProductServices(value: unknown): ProductService[] {
  const raw = safeJsonParse<unknown>(value, [])
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!isObject(item)) return []
    const id = typeof item.id === 'string' ? item.id : null
    const name = typeof item.name === 'string' ? item.name : null
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null
    if (id === null || name === null || price === null) return []
    return [{ id, name, price }]
  })
}

export function parseOrderItemServices(value: unknown): OrderItemService[] {
  const raw = safeJsonParse<unknown>(value, [])
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!isObject(item)) return []
    const name = typeof item.name === 'string' ? item.name : null
    const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null
    if (name === null || price === null) return []
    return [{ name, price }]
  })
}
