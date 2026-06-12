// Шаблоны транзакционных писем. Каждый возвращает { subject, html, text } —
// обязательно multipart (и HTML, и плейнтекст) для доставляемости.

export interface EmailContent {
  subject: string
  html: string
  text: string
}

export interface OrderEmailItem {
  productName: string
  quantity: number
  totalPrice: number
  services: { name: string; price: number }[]
}

const BRAND = 'Заточка Острый край'
const priceFormatter = new Intl.NumberFormat('ru-RU')

function fmt(amount: number): string {
  return `${priceFormatter.format(amount)} ₽`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function layout(heading: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eee;">
        <tr><td style="background:#0988bd;padding:20px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:bold;">${BRAND}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#222;">${heading}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #eee;color:#999;font-size:12px;">
          Это автоматическое письмо, отвечать на него не нужно.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(label: string, link: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr>
    <td style="border-radius:12px;background:#0988bd;">
      <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;">${label}</a>
    </td></tr></table>`
}

function greeting(firstName?: string): string {
  return firstName ? `Здравствуйте, ${escapeHtml(firstName)}!` : 'Здравствуйте!'
}

export function verifyEmailTemplate(params: { firstName?: string; link: string }): EmailContent {
  const subject = `Подтверждение email — ${BRAND}`
  const html = layout('Подтвердите email', `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Чтобы завершить регистрацию, подтвердите адрес электронной почты.</p>
    ${button('Подтвердить email', params.link)}
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Если кнопка не работает, скопируйте ссылку в браузер:<br>
    <a href="${escapeHtml(params.link)}" style="color:#0988bd;word-break:break-all;">${escapeHtml(params.link)}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#999;">Ссылка действует 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.</p>
  `)
  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Чтобы завершить регистрацию на сайте «${BRAND}», подтвердите email, перейдя по ссылке:\n${params.link}\n\n`
    + `Ссылка действует 24 часа. Если вы не регистрировались — проигнорируйте это письмо.`
  return { subject, html, text }
}

export function emailChangeTemplate(params: { firstName?: string; link: string }): EmailContent {
  const subject = `Подтверждение нового email — ${BRAND}`
  const html = layout('Подтвердите новый email', `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Вы запросили смену адреса электронной почты в аккаунте. Подтвердите новый адрес.</p>
    ${button('Подтвердить email', params.link)}
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Если кнопка не работает, скопируйте ссылку в браузер:<br>
    <a href="${escapeHtml(params.link)}" style="color:#0988bd;word-break:break-all;">${escapeHtml(params.link)}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#999;">Ссылка действует 24 часа. Пока вы не перейдёте по ней, прежний email остаётся активным. Если вы не меняли почту — проигнорируйте это письмо.</p>
  `)
  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Вы запросили смену email на сайте «${BRAND}». Подтвердите новый адрес по ссылке:\n${params.link}\n\n`
    + `Ссылка действует 24 часа. Пока вы не перейдёте по ней, прежний email остаётся активным. Если вы не меняли почту — проигнорируйте это письмо.`
  return { subject, html, text }
}

export function passwordResetTemplate(params: { firstName?: string; link: string }): EmailContent {
  const subject = `Восстановление пароля — ${BRAND}`
  const html = layout('Восстановление пароля', `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Мы получили запрос на сброс пароля. Нажмите кнопку, чтобы задать новый пароль.</p>
    ${button('Задать новый пароль', params.link)}
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Если кнопка не работает, скопируйте ссылку в браузер:<br>
    <a href="${escapeHtml(params.link)}" style="color:#0988bd;word-break:break-all;">${escapeHtml(params.link)}</a></p>
    <p style="margin:16px 0 0;font-size:13px;color:#999;">Ссылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо, пароль останется прежним.</p>
  `)
  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Мы получили запрос на сброс пароля на сайте «${BRAND}». Задайте новый пароль по ссылке:\n${params.link}\n\n`
    + `Ссылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте это письмо.`
  return { subject, html, text }
}

export function newPasswordTemplate(params: { firstName?: string; password: string }): EmailContent {
  const subject = `Новый пароль — ${BRAND}`
  const html = layout('Пароль сброшен', `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Ваш пароль был сброшен. Используйте новый пароль для входа:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr>
      <td style="border-radius:12px;background:#f4f4f5;border:1px solid #eee;padding:14px 28px;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:bold;letter-spacing:2px;color:#222;">${escapeHtml(params.password)}</td>
    </tr></table>
    <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">Рекомендуем изменить пароль в настройках личного кабинета позже.</p>
    <p style="margin:16px 0 0;font-size:13px;color:#999;">Если вы не запрашивали сброс пароля — срочно свяжитесь с нами.</p>
  `)
  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Ваш пароль на сайте «${BRAND}» был сброшен. Новый пароль для входа:\n\n${params.password}\n\n`
    + `Рекомендуем изменить пароль в настройках личного кабинета позже.\n\n`
    + `Если вы не запрашивали сброс пароля — срочно свяжитесь с нами.`
  return { subject, html, text }
}

export function orderCreatedTemplate(params: {
  firstName?: string
  orderId: number
  totalAmount: number
  items: OrderEmailItem[]
}): EmailContent {
  const subject = `Заказ №${params.orderId} принят — ${BRAND}`

  const itemRows = params.items.map((item) => {
    const svc = item.services.length
      ? `<div style="color:#888;font-size:12px;">${item.services.map(s => `+ ${escapeHtml(s.name)} (${fmt(s.price)})`).join('<br>')}</div>`
      : ''
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">${escapeHtml(item.productName)} × ${item.quantity}${svc}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;white-space:nowrap;">${fmt(item.totalPrice)}</td>
    </tr>`
  }).join('')

  const html = layout(`Заказ №${params.orderId} принят`, `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Спасибо за заказ! Мы приняли его в обработку.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      ${itemRows}
      <tr><td style="padding:12px 0 0;font-size:15px;font-weight:bold;">Итого</td>
      <td style="padding:12px 0 0;font-size:15px;font-weight:bold;text-align:right;">${fmt(params.totalAmount)}</td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#666;">Мы сообщим, когда заказ будет готов.</p>
  `)

  const textItems = params.items.map((item) => {
    const svc = item.services.map(s => `\n    + ${s.name} (${fmt(s.price)})`).join('')
    return `- ${item.productName} × ${item.quantity} — ${fmt(item.totalPrice)}${svc}`
  }).join('\n')

  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Спасибо за заказ №${params.orderId} на сайте «${BRAND}»! Мы приняли его в обработку.\n\n`
    + `${textItems}\n\nИтого: ${fmt(params.totalAmount)}\n\nМы сообщим, когда заказ будет готов.`
  return { subject, html, text }
}

export function orderReadyTemplate(params: { firstName?: string; orderId: number }): EmailContent {
  const subject = `Заказ №${params.orderId} готов — ${BRAND}`
  const html = layout(`Заказ №${params.orderId} готов`, `
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${greeting(params.firstName)}<br>
    Ваш заказ №${params.orderId} готов. Мы свяжемся с вами по поводу выдачи или доставки.</p>
  `)
  const text = `${params.firstName ? `Здравствуйте, ${params.firstName}!` : 'Здравствуйте!'}\n\n`
    + `Ваш заказ №${params.orderId} в «${BRAND}» готов. Мы свяжемся с вами по поводу выдачи или доставки.`
  return { subject, html, text }
}
