import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'

export interface OrelDeliveryConfig {
  fee: number
  freeThreshold: number
  polygon: [number, number][] | null
}

let cachedOrelConfig: OrelDeliveryConfig | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

export async function getOrelDeliveryConfig(): Promise<OrelDeliveryConfig> {
  if (cachedOrelConfig && Date.now() - cacheTime < CACHE_TTL) {
    return cachedOrelConfig
  }

  const db = useDb()
  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'delivery_orel_fee'))

  const allRows = await db.select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)

  const byKey = new Map(allRows.map(r => [r.key, r.value]))

  const fee = Number(byKey.get('delivery_orel_fee') ?? 200)
  const freeThreshold = Number(byKey.get('delivery_orel_free_threshold') ?? 3000)
  let polygon: [number, number][] | null = null

  const polygonRaw = byKey.get('delivery_orel_polygon')
  if (polygonRaw) {
    try {
      const parsed = JSON.parse(polygonRaw)
      if (Array.isArray(parsed) && parsed.length >= 4) polygon = parsed
    }
    catch {}
  }

  cachedOrelConfig = { fee, freeThreshold, polygon }
  cacheTime = Date.now()
  return cachedOrelConfig
}

export function pointInPolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

export function calcOrelDeliveryCost(goodsTotal: number, config: OrelDeliveryConfig): number {
  return goodsTotal >= config.freeThreshold ? 0 : config.fee
}
