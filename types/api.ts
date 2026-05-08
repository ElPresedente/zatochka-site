import type { OrderStatus } from '~/server/db/schema'

export type { OrderStatus }

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
