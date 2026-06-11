import dns from 'node:dns'
import nodemailer, { type Transporter } from 'nodemailer'

// Многие сети резолвят smtp-хост в IPv6, но не имеют IPv6-маршрута → ENETUNREACH.
// Предпочитаем IPv4, чтобы соединение шло по доступному адресу.
dns.setDefaultResultOrder('ipv4first')

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

let cachedTransporter: Transporter | null = null

/**
 * Провайдеро-независимый слой отправки. Транспорт настраивается через env и
 * указывает на наш MTA (Postfix/OpenDKIM) по submission (587, SASL + STARTTLS).
 * Сменой переменных окружения можно перенаправить на внешний релей без правок кода.
 *
 * Если SMTP не сконфигурирован (dev без MTA/перехватчика) — письмо логируется
 * в консоль вместо доставки, чтобы можно было проверить содержимое и ссылки.
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter

  const config = useRuntimeConfig()
  const host = config.smtpHost
  if (!host) return null

  const port = Number(config.smtpPort) || 587
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    // 465 — implicit TLS, 587/25 — STARTTLS
    secure: port === 465,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined,
    // Быстро падать, если порт заблокирован/сервер недоступен (по умолчанию у nodemailer ~2 мин).
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })
  return cachedTransporter
}

export async function sendMail(message: MailMessage): Promise<void> {
  const config = useRuntimeConfig()
  const from = config.mailFrom || 'noreply@localhost'
  const transporter = getTransporter()

  if (!transporter) {
    console.info(
      `[mail] SMTP не сконфигурирован — письмо не отправлено, выводим в консоль.\n` +
      `  to: ${message.to}\n  subject: ${message.subject}\n  text:\n${message.text}`,
    )
    return
  }

  try {
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    })
  }
  catch (err) {
    console.error('[mail] Failed to send email to', message.to, err)
    throw err
  }
}
