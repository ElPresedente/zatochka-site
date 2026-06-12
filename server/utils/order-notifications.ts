import type { OrderStatus } from '~/server/db/schema'

export interface DeletionRequestPayload {
  userId: number
  firstName: string
  lastName: string
  phone: string
}

export interface PasswordResetRequestPayload {
  userId: number
  firstName: string
  lastName: string
  phone: string
}

export interface OrderNotificationItem {
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  services: { name: string; price: number }[]
}

export interface OrderNotificationPayload {
  id: number
  totalAmount: number
  status: OrderStatus
  paymentMethod: 'cash' | 'online_card'
  items: OrderNotificationItem[]
}

const priceFormatter = new Intl.NumberFormat('ru-RU')

function fmt(amount: number): string {
  return `${priceFormatter.format(amount)} ₽`
}


export async function notifyOrderCreated(order: OrderNotificationPayload) {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  const chatId = config.telegramChatId

  if (!token || !chatId) {
    console.info('[tg] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping notification')
    return
  }

  const itemLines = order.items.map((item) => {
    const lines = [`▪️ <b>${item.productName}</b> × ${item.quantity} — ${fmt(item.totalPrice)}`]
    for (const svc of item.services) {
      lines.push(`    + ${svc.name} (${fmt(svc.price)})`)
    }
    return lines.join('\n')
  })

  const paymentLabel = order.paymentMethod === 'online_card' ? '💳 Картой онлайн' : '💵 Наличными'

  const parts = [
    '🛒 <b>Новый заказ!</b>',
    '',
    `📋 Заказ <b>№${order.id}</b>`,
    '',
    ...itemLines,
    '',
    `💰 Итого: <b>${fmt(order.totalAmount)}</b>`,
    `💳 Оплата: ${paymentLabel}`,
  ]

  try {
    await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: parts.join('\n'),
        parse_mode: 'HTML',
      },
    })
  } catch (err) {
    console.error('[tg] Failed to send notification for order', order.id, err)
  }
}

export async function notifyDeletionRequest(payload: DeletionRequestPayload) {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  const chatId = config.telegramChatId

  if (!token || !chatId) {
    console.info('[tg] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping deletion request notification')
    return
  }

  const parts = [
    '🗑 <b>Запрос на удаление аккаунта</b>',
    '',
    `👤 ${payload.lastName} ${payload.firstName} (ID: ${payload.userId})`,
    `📞 ${payload.phone}`,
    '',
    'Пользователь отозвал согласие на обработку ПДн. Удалите аккаунт в разделе <b>Пользователи</b> в админке.',
  ]

  try {
    await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: parts.join('\n'),
        parse_mode: 'HTML',
      },
    })
  } catch (err) {
    console.error('[tg] Failed to send deletion request notification for user', payload.userId, err)
  }
}

export async function notifyPasswordReset(payload: PasswordResetRequestPayload) {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  const chatId = config.telegramChatId

  if (!token || !chatId) {
    console.info('[tg] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping password reset notification')
    return
  }

  const parts = [
    '🔑 <b>Сброс пароля</b>',
    '',
    `Пользователь ${payload.lastName} ${payload.firstName} (ID: ${payload.userId}, ${payload.phone}) сбросил пароль. Новый пароль отправлен ему на почту.`,
  ]

  try {
    await $fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: {
        chat_id: chatId,
        text: parts.join('\n'),
        parse_mode: 'HTML',
      },
    })
  } catch (err) {
    console.error('[tg] Failed to send password reset notification for user', payload.userId, err)
  }
}
