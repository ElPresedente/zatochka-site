import { cdekCities } from '~/server/utils/cdek'

// Автодополнение города для выбора ПВЗ СДЭК. Публичный GET, без побочных эффектов.
export default defineEventHandler(async (event) => {
  const q = String(getQuery(event).q ?? '').trim()
  if (q.length < 2) return []

  try {
    return await cdekCities(q)
  }
  catch (err: any) {
    console.error('[cdek] cities lookup failed', err?.statusCode ?? err?.message ?? err)
    throw createError({ statusCode: 502, message: 'Не удалось загрузить список городов' })
  }
})
