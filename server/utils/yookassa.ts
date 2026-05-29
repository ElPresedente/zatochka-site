export interface ReceiptItem {
  description: string
  quantity: string
  amount: { value: string; currency: 'RUB' }
  vat_code: 1
  payment_mode: 'full_payment'
  payment_subject: 'commodity' | 'service'
}

export interface YookassaPaymentResult {
  id: string
  status: string
  confirmationUrl: string
}

export function buildReceiptItems(items: Array<{
  productName: string
  quantity: number
  unitPrice: number
  services: { name: string; price: number }[]
}>): ReceiptItem[] {
  const lines: ReceiptItem[] = []

  for (const item of items) {
    const servicesSum = item.services.reduce((s, svc) => s + svc.price, 0)
    const basePrice = item.unitPrice - servicesSum

    if (basePrice > 0) {
      lines.push({
        description: item.productName.substring(0, 128),
        quantity: item.quantity.toFixed(2),
        amount: { value: (basePrice * item.quantity).toFixed(2), currency: 'RUB' },
        vat_code: 1,
        payment_mode: 'full_payment',
        payment_subject: 'commodity',
      })
    }

    for (const svc of item.services) {
      if (svc.price > 0) {
        lines.push({
          description: svc.name.substring(0, 128),
          quantity: item.quantity.toFixed(2),
          amount: { value: (svc.price * item.quantity).toFixed(2), currency: 'RUB' },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'service',
        })
      }
    }
  }

  return lines
}

function getAuthHeader(): string {
  const config = useRuntimeConfig()
  return `Basic ${Buffer.from(`${config.yookassaShopId}:${config.yookassaSecretKey}`).toString('base64')}`
}

export function buildAdjustmentReceiptItem(description: string, amountRubles: number): ReceiptItem {
  return {
    description: description.substring(0, 128),
    quantity: '1.00',
    amount: { value: amountRubles.toFixed(2), currency: 'RUB' },
    vat_code: 1,
    payment_mode: 'full_payment',
    payment_subject: 'commodity',
  }
}

export async function createYookassaPayment(
  orderId: number,
  amountRubles: number,
  returnUrl: string,
  receipt?: { email: string; items: ReceiptItem[] },
  paymentType: 'main' | 'extra' = 'main',
): Promise<YookassaPaymentResult> {
  const body: Record<string, unknown> = {
    amount: { value: amountRubles.toFixed(2), currency: 'RUB' },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: paymentType === 'extra' ? `Доплата к заказу №${orderId}` : `Заказ №${orderId}`,
    metadata: paymentType === 'extra'
      ? { order_id: String(orderId), payment_type: 'extra' }
      : { order_id: String(orderId) },
  }

  if (receipt) {
    body.receipt = {
      customer: { email: receipt.email },
      items: receipt.items,
    }
  }

  const result = await $fetch<any>('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Idempotence-Key': crypto.randomUUID(),
    },
    body,
  })

  return {
    id: result.id,
    status: result.status,
    confirmationUrl: result.confirmation.confirmation_url,
  }
}

export async function fetchYookassaPayment(paymentId: string): Promise<{
  id: string
  status: string
  metadata: Record<string, string>
}> {
  const result = await $fetch<any>(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  return {
    id: result.id,
    status: result.status,
    metadata: result.metadata ?? {},
  }
}

export async function createYookassaRefund(
  paymentId: string,
  amountRubles: number,
  receipt?: { email: string; items: ReceiptItem[] },
): Promise<void> {
  const body: Record<string, unknown> = {
    payment_id: paymentId,
    amount: { value: amountRubles.toFixed(2), currency: 'RUB' },
  }
  if (receipt) {
    body.receipt = {
      customer: { email: receipt.email },
      items: receipt.items,
    }
  }
  await $fetch<any>('https://api.yookassa.ru/v3/refunds', {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Idempotence-Key': crypto.randomUUID(),
    },
    body,
  })
}
