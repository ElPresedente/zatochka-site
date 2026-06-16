// Конвенция приватных ключей site_settings: всё с префиксом `private_` НЕ должно
// попадать в публичный GET /api/settings. Фильтр по префиксу, а не ручной блок-лист,
// чтобы новый приватный ключ не утёк по забывчивости.

export const PRIVATE_KEY_PREFIX = 'private_'

export function isPrivateSettingKey(key: string): boolean {
  return key.startsWith(PRIVATE_KEY_PREFIX)
}

/** Ключ настройки: email-адреса для уведомлений администратора о новых заказах. */
export const ORDER_NOTIFICATION_EMAILS_KEY = 'private_order_notification_emails'
