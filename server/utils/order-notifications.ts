import type { OrderStatus } from '~/server/db/schema'

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

  const parts = [
    '🛒 <b>Новый заказ!</b>',
    '',
    `📋 Заказ <b>№${order.id}</b>`,
    '',
    ...itemLines,
    '',
    `💰 Итого: <b>${fmt(order.totalAmount)}</b>`,
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
