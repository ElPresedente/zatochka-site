import { warmCdekOfficesCache } from '~/server/utils/cdek'

// Прогрев кэша списка ПВЗ СДЭК при старте сервера. Виджет при открытии тянет ~10 500
// точек страницами по 500 (~3 МБ gzip). Прогреваем заранее теми же запросами, чтобы
// первый пользователь получил список из кэша мгновенно. Fire-and-forget — не блокирует
// старт; в dev пропускаем, чтобы не дёргать СДЭК на каждый рестарт.
export default defineNitroPlugin(() => {
  if (import.meta.dev) return

  warmCdekOfficesCache()
    .then(({ pages, total }) =>
      console.log(`[CDEK] offices cache warmed: ${total} points in ${pages} pages`),
    )
    .catch((err: any) =>
      console.error('[CDEK] offices cache warmup failed:', err?.statusCode ?? err?.message ?? err),
    )
})
