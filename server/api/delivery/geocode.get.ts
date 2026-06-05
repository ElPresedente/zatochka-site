import { getOrelDeliveryConfig, pointInPolygon } from '~/server/utils/delivery'

export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 3) throw createError({ statusCode: 400, message: 'q must be at least 3 characters' })

  const geocoderKey = useRuntimeConfig().yandexMapsGeocoderKey
  if (!geocoderKey) throw createError({ statusCode: 503, message: 'Geocoder not configured' })

  let data: any
  try {
    data = await $fetch('https://geocode-maps.yandex.ru/1.x/', {
      query: { apikey: geocoderKey, format: 'json', geocode: q, results: 1, lang: 'ru_RU' },
    })
  }
  catch {
    throw createError({ statusCode: 502, message: 'Geocoder unavailable' })
  }

  const featureMember = data?.response?.GeoObjectCollection?.featureMember
  if (!Array.isArray(featureMember) || !featureMember.length) return { coords: null, inZone: null }

  const pos: string | undefined = featureMember[0]?.GeoObject?.Point?.pos
  if (!pos) return { coords: null, inZone: null }

  const [lon, lat] = pos.split(' ').map(Number)
  if (!isFinite(lat) || !isFinite(lon)) return { coords: null, inZone: null }

  const config = await getOrelDeliveryConfig()
  const inZone = config.polygon ? pointInPolygon(lat, lon, config.polygon) : true

  return { coords: { lat, lon }, inZone }
})
