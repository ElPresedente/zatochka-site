import { cdekWidgetRequest } from '~/server/utils/cdek'

// Виджет CDEK v3 шлёт POST с JSON-телом, где action и данные лежат вместе
// (например calculate для расчёта тарифа). Эталонный service.php делает json_decode
// СЫРОГО тела независимо от content-type — повторяем, чтобы не зависеть от парсера h3,
// если виджет выставит content-type вроде text/plain.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  let body: Record<string, any> = {}

  const raw = await readRawBody(event)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') body = parsed
    }
    catch {
      // не JSON — оставляем body пустым, action может прийти в query
    }
  }

  return cdekWidgetRequest({ ...query, ...body })
})
