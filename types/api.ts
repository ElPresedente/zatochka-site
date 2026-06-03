import type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod, DeliveryScope } from '~/server/db/schema'

export type { OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod, DeliveryScope }
export type ExtraPaymentStatus = 'none' | 'pending' | 'paid' | 'failed'

export interface ProductSpec {
  key: string
  value: string
}

export interface ProductService {
  id: string
  name: string
  price: number
}

export interface OrderItemService {
  name: string
  price: number
}

export interface ProductDto {
  id: number
  categoryId: number
  category: string
  name: string
  price: number
  stock: number
  description: string
  photos: string[]
  specs: ProductSpec[]
  services: ProductService[]
  active: boolean
  sortOrder: number
  coverPosition: string
  weightG: number
  lengthCm: number
  widthCm: number
  heightCm: number
  createdAt?: string
  updatedAt?: string
}

export interface ProductCategoryDto {
  id: number
  name: string
  sortOrder: number
  hidden: boolean
}

export interface OrderRowDto {
  id: number
  userId: number
  customerFirstName: string
  customerLastName: string
  customerPhone: string
  userComment: string
  sellerComment: string
  status: OrderStatus
  totalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  yookassaPaymentId: string | null
  paidAt: string | null
  extraPaymentId: string | null
  extraPaymentAmount: number | null
  extraPaymentStatus: ExtraPaymentStatus
  deliveryMethod: DeliveryMethod
  deliveryScope: DeliveryScope | null
  deliveryAddress: string | null
  deliveryCoords: string | null
  deliveryCost: number
  cdekPvzCode: string | null
  cdekPvzAddress: string | null
  cdekPvzCity: string | null
  cdekTariffCode: number | null
  cdekDeliveryDaysMin: number | null
  cdekDeliveryDaysMax: number | null
  cdekOrderUuid: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItemDto {
  id: number
  orderId: number
  productId: number | null
  productName: string
  productPhoto: string
  unitPrice: number
  quantity: number
  totalPrice: number
  services: OrderItemService[]
}

export interface OrderHistoryDto {
  id: number
  orderId: number
  description: string
  createdAt: string
}

export interface OrderDetailsDto extends OrderRowDto {
  items: OrderItemDto[]
  history: OrderHistoryDto[]
}

export interface ProductCollectionDto {
  id: number
  name: string
  sortOrder: number
  active: boolean
  products: ProductDto[]
}

export interface AdminProductCollectionDto {
  id: number
  name: string
  sortOrder: number
  active: boolean
  productIds: number[]
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Не оплачен',
  paid: 'Оплачен',
  failed: 'Ошибка оплаты',
  refunded: 'Возврат',
  waiting_for_capture: 'Ожидает списания',
}

export const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  unpaid: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  refunded: 'bg-slate-100 text-slate-600',
  waiting_for_capture: 'bg-blue-100 text-blue-700',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличными',
  online_card: 'Картой онлайн',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Создан',
  cancelled: 'Отменён',
  accepted: 'Принят',
  in_progress: 'В работе',
  ready: 'Готов к выдаче',
  completed: 'Завершён',
}

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  created: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-600',
  accepted: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-slate-100 text-slate-600',
}
