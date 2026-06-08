import { cdekCityOffices } from '~/server/utils/cdek'
import { parsePositiveInteger } from '~/server/utils/validators'

// ПВЗ выбранного города (для списка + карты в корзине). Публичный GET.
export default defineEventHandler(async (event) => {
  const cityCode = parsePositiveInteger(getQuery(event).cityCode, 'cityCode')

  try {
    return await cdekCityOffices(cityCode)
  }
  catch (err: any) {
    console.error('[cdek] city offices failed', cityCode, err?.statusCode ?? err?.message ?? err)
    throw createError({ statusCode: 502, message: 'Не удалось загрузить пункты выдачи' })
  }
})
