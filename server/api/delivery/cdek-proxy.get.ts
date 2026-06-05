import { cdekWidgetRequest } from '~/server/utils/cdek'

// Виджет CDEK v3 шлёт GET с ?action=<name>&...params (например offices).
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>
  if (!q.action) {
    // Health-check / первичный пинг виджета — отвечаем OK
    return {}
  }
  return cdekWidgetRequest(q)
})
