import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { siteSettings } from '~/server/db/schema'

// Fallback polygon for Oryol city (rough boundary)
const OREL_DEFAULT_POLYGON: [number, number][] = [
  [52.9800, 36.0600], [52.9900, 36.0200], [52.9980, 35.9800],
  [53.0050, 35.9600], [53.0200, 35.9700], [53.0300, 36.0000],
  [53.0350, 36.0400], [53.0300, 36.0900], [53.0150, 36.1300],
  [53.0000, 36.1600], [52.9800, 36.1700], [52.9600, 36.1600],
  [52.9400, 36.1400], [52.9200, 36.1200], [52.9100, 36.0900],
  [52.9100, 36.0500], [52.9200, 36.0100], [52.9400, 35.9700],
  [52.9600, 35.9600], [52.9800, 36.0600],
]

async function fetchOrelPolygonFromNominatim(): Promise<[number, number][] | null> {
  try {
    const data = await $fetch<any>(
      'https://nominatim.openstreetmap.org/search.php?q=%D0%9E%D1%80%D1%91%D0%BB&countrycodes=ru&format=jsonv2&polygon_geojson=1&featuretype=city&limit=1',
      { headers: { 'User-Agent': 'zatochkaorel.ru delivery zone setup' } },
    )
    const item = Array.isArray(data) ? data[0] : null
    if (!item?.geojson) return null
    const geo = item.geojson

    let coords: number[][] | null = null
    if (geo.type === 'Polygon') {
      coords = geo.coordinates[0]
    }
    else if (geo.type === 'MultiPolygon') {
      // Largest ring by area (first exterior ring of each polygon)
      let largest: number[][] = []
      for (const poly of geo.coordinates) {
        if (poly[0].length > largest.length) largest = poly[0]
      }
      coords = largest
    }
    if (!coords || coords.length < 4) return null
    // Nominatim returns [lon, lat], we need [lat, lon]
    return coords.map(([lon, lat]: number[]) => [lat, lon] as [number, number])
  }
  catch {
    return null
  }
}

export default defineEventHandler(async () => {
  const db = useDb()

  const [row] = await db.select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, 'delivery_orel_polygon'))

  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value)
      if (Array.isArray(parsed) && parsed.length >= 4) return { coords: parsed }
    }
    catch {}
  }

  // Try to fetch from Nominatim and cache
  const fetched = await fetchOrelPolygonFromNominatim()
  const polygon = fetched ?? OREL_DEFAULT_POLYGON

  await db.insert(siteSettings)
    .values({ key: 'delivery_orel_polygon', value: JSON.stringify(polygon) })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: JSON.stringify(polygon) } })

  return { coords: polygon }
})
