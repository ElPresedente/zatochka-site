import { cdekOfficeTariff, type CdekPackage } from '~/server/utils/cdek'
import { parsePositiveInteger } from '~/server/utils/validators'

// Расчёт тарифа доставки до ПВЗ выбранного города. POST (защищён same-origin guard).
// Тело: { cityCode: number, goods?: CdekPackage[] }.
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const cityCode = parsePositiveInteger(body?.cityCode, 'cityCode')

  const goods: CdekPackage[] = Array.isArray(body?.goods) && body.goods.length
    ? body.goods.map((g: any) => ({
        weight: Number(g?.weight) > 0 ? Number(g.weight) : 1000,
        length: Number(g?.length) > 0 ? Number(g.length) : 10,
        width: Number(g?.width) > 0 ? Number(g.width) : 10,
        height: Number(g?.height) > 0 ? Number(g.height) : 10,
      }))
    : [{ weight: 1000, length: 10, width: 10, height: 10 }]

  try {
    const tariff = await cdekOfficeTariff(cityCode, goods)
    if (!tariff) {
      throw createError({ statusCode: 422, message: 'Нет доступных тарифов для этого города' })
    }
    return tariff
  }
  catch (err: any) {
    if (err?.statusCode === 422) throw err
    console.error('[cdek] tariff calc failed', cityCode, err?.statusCode ?? err?.message ?? err)
    throw createError({ statusCode: 502, message: 'Не удалось рассчитать стоимость доставки' })
  }
})
