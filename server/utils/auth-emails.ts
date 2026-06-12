import { issueToken } from '~/server/utils/email-tokens'
import { sendMail } from '~/server/utils/mailer'
import {
  verifyEmailTemplate,
  emailChangeTemplate,
  passwordResetTemplate,
  newPasswordTemplate,
  orderCreatedTemplate,
  orderReadyTemplate,
  type OrderEmailItem,
} from '~/server/utils/email-templates'

function appUrl(): string {
  const config = useRuntimeConfig()
  return (config.appUrl || config.siteUrl || '').replace(/\/+$/, '')
}

/** Письмо подтверждения email. Ссылка ведёт на серверный GET-хендлер verify-email. */
export async function sendVerificationEmail(user: { id: number; firstName: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'verify')
  const link = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  const content = verifyEmailTemplate({ firstName: user.firstName, link })
  await sendMail({ to: user.email, ...content })
}

/**
 * Письмо подтверждения нового email при смене в профиле. Ссылка ведёт на тот же
 * GET-хендлер verify-email; он применит `pending_email` после перехода.
 * Отправляется на НОВЫЙ адрес.
 */
export async function sendEmailChangeVerification(user: { id: number; firstName: string; newEmail: string }): Promise<void> {
  const token = await issueToken(user.id, 'verify')
  const link = `${appUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`
  const content = emailChangeTemplate({ firstName: user.firstName, link })
  await sendMail({ to: user.newEmail, ...content })
}

/** Письмо сброса пароля. Ссылка ведёт на страницу с формой нового пароля. */
export async function sendPasswordResetEmail(user: { id: number; firstName: string; email: string }): Promise<void> {
  const token = await issueToken(user.id, 'reset')
  const link = `${appUrl()}/reset?token=${encodeURIComponent(token)}`
  const content = passwordResetTemplate({ firstName: user.firstName, link })
  await sendMail({ to: user.email, ...content })
}

/**
 * Письмо со сгенерированным новым паролем (сброс пользователем в ЛК или админом).
 * Пароль уже сохранён в БД к моменту отправки.
 */
export async function sendNewPasswordEmail(user: { firstName?: string; email: string }, password: string): Promise<void> {
  const content = newPasswordTemplate({ firstName: user.firstName, password })
  await sendMail({ to: user.email, ...content })
}

/**
 * Уведомления о заказе не должны ломать основной поток — ошибки только логируем.
 */
export async function sendOrderCreatedEmail(params: {
  email: string
  firstName?: string
  orderId: number
  totalAmount: number
  items: OrderEmailItem[]
}): Promise<void> {
  if (!params.email) return
  try {
    const content = orderCreatedTemplate(params)
    await sendMail({ to: params.email, ...content })
  }
  catch (err) {
    console.error('[mail] order-created email failed for order', params.orderId, err)
  }
}

export async function sendOrderReadyEmail(params: {
  email: string
  firstName?: string
  orderId: number
}): Promise<void> {
  if (!params.email) return
  try {
    const content = orderReadyTemplate(params)
    await sendMail({ to: params.email, ...content })
  }
  catch (err) {
    console.error('[mail] order-ready email failed for order', params.orderId, err)
  }
}
