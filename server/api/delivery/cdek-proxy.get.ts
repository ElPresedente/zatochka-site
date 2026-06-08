import { cdekWidgetRequest, cdekOfficesRaw, gunzipOfficesBody } from '~/server/utils/cdek'

// Виджет CDEK v3 шлёт GET с ?action=<name>&...params (например offices).
export default defineEventHandler(async (event) => {
  const q = getQuery(event) as Record<string, any>
  if (!q.action) {
    // Health-check / первичный пинг виджета — отвечаем OK
    return {}
  }

  // offices = список ПВЗ. СДЭК пагинирует (page/size) и отдаёт тело gzip. Отдаём
  // сырые gzip-байты насквозь (без распаковки/парсинга) И форвардим заголовки
  // X-Total-Elements / X-Total-Pages — без них виджет не пагинирует и качает весь
  // список (18 МБ) одним запросом. См. cdekOfficesRaw в server/utils/cdek.ts.
  if (q.action === 'offices') {
    const { action: _omit, ...params } = q
    const resp = await cdekOfficesRaw(params)
    setHeader(event, 'content-type', resp.contentType)
    if (resp.totalElements) setHeader(event, 'x-total-elements', resp.totalElements)
    if (resp.totalPages) setHeader(event, 'x-total-pages', resp.totalPages)

    const acceptsGzip = (getHeader(event, 'accept-encoding') || '').includes('gzip')
    if (resp.encoding === 'gzip' && acceptsGzip) {
      // Браузер сам распакует — отдаём сжатое тело как есть.
      setHeader(event, 'content-encoding', 'gzip')
      setHeader(event, 'vary', 'Accept-Encoding')
      return resp.body
    }
    // Редкий клиент без gzip — распаковываем на лету (CPU, но почти не случается).
    return gunzipOfficesBody(resp)
  }

  return cdekWidgetRequest(q)
})
