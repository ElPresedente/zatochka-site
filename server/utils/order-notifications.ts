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

export async function notifyPasswordResetRequest(payload: PasswordResetRequestPayload) {
  // TODO: Replace with Nodemailer + Yandex SMTP once email field is added to users.
  // Steps:
  //   1. Add `email` field to users table (migration + register form)
  //   2. Generate a signed reset token, store in password_reset_tokens table with expiresAt
  //   3. Send email via nodemailer with transporter = createTransport({ host: 'smtp.yandex.ru', port: 465, ... })
  //   4. Create page /reset-password?token=... to validate token and set new password
  //   5. Remove Telegram fallback below

  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  const chatId = config.telegramChatId

  if (!token || !chatId) {
    console.info('[tg] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping password reset notification')
    return
  }

  const parts = [
    '🔑 <b>Заявка на сброс пароля</b>',
    '',
    `👤 ${payload.lastName} ${payload.firstName} (ID: ${payload.userId})`,
    `📞 ${payload.phone}`,
    '',
    'Свяжитесь с пользователем и сбросьте пароль вручную в разделе <b>Пользователи</b> в админке.',
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
