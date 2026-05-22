<script setup lang="ts">
import type { OrderDetailsDto, OrderItemDto, OrderItemService, OrderRowDto, OrderStatus, ProductDto, ProductService } from '~/types/api'
import { formatPhone } from '~/composables/useFormatters'

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active' | 'services'>

interface FormItem extends OrderItemDto {
  serviceIds: string[]
}

const props = defineProps<{
  orderId: number
  adminProducts: AdminProduct[] | null
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const selectedOrder = ref<OrderDetailsDto | null>(null)
const detailsLoading = ref(false)
const actionLoading = ref<OrderStatus | null>(null)
const editSaving = ref(false)
const actionError = ref('')
const sellerCommentForm = ref('')
const totalAmountForm = ref(0)
const orderItemsForm = ref<FormItem[]>([])
const originalItems = ref<FormItem[]>([])
const showPicker = ref(false)

function deriveServiceIds(item: OrderItemDto): string[] {
  if (!item.productId) return []
  const product = props.adminProducts?.find(p => p.id === item.productId)
  if (!product) return []
  return (item.services as OrderItemService[]).flatMap((svc) => {
    const match = (product.services as ProductService[]).find(ps => ps.name === svc.name && ps.price === svc.price)
    return match ? [match.id] : []
  })
}

function applyOrder(order: OrderDetailsDto) {
  selectedOrder.value = order
  sellerCommentForm.value = order.sellerComment
  totalAmountForm.value = order.totalAmount
  const formItems = order.items.map(item => ({ ...item, serviceIds: deriveServiceIds(item) }))
  orderItemsForm.value = formItems
  originalItems.value = formItems.map(i => ({ ...i }))
}

async function loadOrder() {
  detailsLoading.value = true
  actionError.value = ''
  selectedOrder.value = null
  try {
    const order = await $fetch<OrderDetailsDto>(`/api/admin/orders/${props.orderId}`)
    applyOrder(order)
  }
  finally {
    detailsLoading.value = false
  }
}

await loadOrder()

const orderItemsPayload = computed(() => orderItemsForm.value
  .filter(item => item.productId)
  .map(item => ({
    productId: item.productId as number,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    serviceIds: item.serviceIds,
  })))

const orderItemsSubtotal = computed(() => orderItemsForm.value
  .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))

const hasOrderItemsChanges = computed(() => {
  if (!selectedOrder.value) return false
  if (!canEditItems(selectedOrder.value.status)) return false
  const original = originalItems.value
    .filter(i => i.productId)
    .map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, serviceIds: i.serviceIds }))
  return JSON.stringify(orderItemsPayload.value) !== JSON.stringify(original)
})

const hasOrderEditChanges = computed(() => {
  if (!selectedOrder.value) return false
  return sellerCommentForm.value.trim() !== selectedOrder.value.sellerComment
    || totalAmountForm.value !== selectedOrder.value.totalAmount
    || hasOrderItemsChanges.value
})

const availableActions = computed(() => {
  const status = selectedOrder.value?.status
  if (status === 'created') {
    return [
      { status: 'accepted' as const, label: 'Принять заказ', class: 'bg-green-600 text-white hover:bg-green-700' },
      { status: 'cancelled' as const, label: 'Отклонить', class: 'bg-red-50 text-red-600 hover:bg-red-100' },
    ]
  }
  if (status === 'accepted') {
    return [
      { status: 'in_progress' as const, label: 'В работу', class: 'bg-blue-600 text-white hover:bg-blue-700' },
      { status: 'cancelled' as const, label: 'Отменить', class: 'bg-red-50 text-red-600 hover:bg-red-100' },
    ]
  }
  if (status === 'in_progress') {
    return [
      { status: 'ready' as const, label: 'Готов к выдаче', class: 'bg-purple-600 text-white hover:bg-purple-700' },
      { status: 'cancelled' as const, label: 'Отменить', class: 'bg-red-50 text-red-600 hover:bg-red-100' },
    ]
  }
  if (status === 'ready') {
    return [
      { status: 'completed' as const, label: 'Завершить', class: 'bg-brand text-white hover:brightness-110' },
      { status: 'cancelled' as const, label: 'Отменить', class: 'bg-red-50 text-red-600 hover:bg-red-100' },
    ]
  }
  return []
})

function customerName(order: { customerFirstName: string, customerLastName: string }) {
  return `${order.customerFirstName} ${order.customerLastName}`.trim()
}

function canEditTotalAmount(status: OrderStatus) {
  return status === 'created' || status === 'accepted' || status === 'in_progress'
}

function canEditItems(status: OrderStatus) {
  return status === 'created' || status === 'accepted' || status === 'in_progress'
}

function syncTotalFromItems() {
  totalAmountForm.value = orderItemsSubtotal.value
}

function setOrderItemQuantity(index: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) return
  orderItemsForm.value[index].quantity = quantity
  orderItemsForm.value[index].totalPrice = orderItemsForm.value[index].unitPrice * quantity
  syncTotalFromItems()
}

function setOrderItemUnitPrice(index: number, price: number) {
  if (!Number.isInteger(price) || price < 0) return
  orderItemsForm.value[index].unitPrice = price
  orderItemsForm.value[index].totalPrice = price * orderItemsForm.value[index].quantity
  syncTotalFromItems()
}

function removeOrderItem(index: number) {
  orderItemsForm.value.splice(index, 1)
  syncTotalFromItems()
}

function comboKey(productId: number, serviceIds: string[]): string {
  const sorted = [...serviceIds].sort()
  return sorted.length ? `${productId}:${sorted.join(',')}` : String(productId)
}

function handlePickerAdd(pickerItems: { productId: number, quantity: number, serviceIds: string[] }[]) {
  for (const { productId, quantity, serviceIds } of pickerItems) {
    const product = props.adminProducts?.find(p => p.id === productId)
    if (!product) continue

    const existingIndex = orderItemsForm.value.findIndex(item =>
      item.productId === productId
      && comboKey(productId, item.serviceIds) === comboKey(productId, serviceIds),
    )

    if (existingIndex >= 0) {
      setOrderItemQuantity(existingIndex, orderItemsForm.value[existingIndex].quantity + quantity)
    }
    else {
      const selectedSvcs = (product.services as ProductService[]).filter(s => serviceIds.includes(s.id))
      const servicesTotal = selectedSvcs.reduce((s, sv) => s + sv.price, 0)
      const unitPrice = product.price + servicesTotal

      orderItemsForm.value.push({
        id: -(Date.now() + Math.random()),
        orderId: selectedOrder.value?.id ?? 0,
        productId: product.id,
        productName: product.name,
        productPhoto: product.photos[0] ?? '',
        unitPrice,
        quantity,
        totalPrice: unitPrice * quantity,
        services: selectedSvcs.map(s => ({ name: s.name, price: s.price })),
        serviceIds,
      } as FormItem)
    }
  }
  syncTotalFromItems()
  showPicker.value = false
}

async function saveOrderEdits(): Promise<boolean> {
  if (!selectedOrder.value || !hasOrderEditChanges.value) return true

  editSaving.value = true
  actionError.value = ''
  try {
    const updated = await $fetch<OrderRowDto>(`/api/admin/orders/${selectedOrder.value.id}`, {
      method: 'PUT',
      body: {
        sellerComment: sellerCommentForm.value,
        totalAmount: totalAmountForm.value,
        ...(hasOrderItemsChanges.value ? { items: orderItemsPayload.value } : {}),
      },
    })
    const fresh = await $fetch<OrderDetailsDto>(`/api/admin/orders/${updated.id}`)
    applyOrder(fresh)
    emit('changed')
    return true
  }
  catch (err: any) {
    actionError.value = err?.data?.message ?? 'Не удалось сохранить изменения'
    return false
  }
  finally {
    editSaving.value = false
  }
}

async function setStatus(status: OrderStatus) {
  if (!selectedOrder.value) return

  actionLoading.value = status
  actionError.value = ''
  try {
    if (!await saveOrderEdits()) return

    const updated = await $fetch<OrderRowDto>(`/api/admin/orders/${selectedOrder.value.id}/status`, {
      method: 'PUT',
      body: { status },
    })
    selectedOrder.value = { ...selectedOrder.value, ...updated }
    emit('changed')
    emit('close')
  }
  catch (err: any) {
    actionError.value = err?.data?.message ?? 'Не удалось изменить статус'
  }
  finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-0 sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-[860px] sm:max-h-[90vh] flex flex-col shadow-2xl">
        <div class="flex items-start justify-between gap-3 px-4 lg:px-7 py-4 lg:py-5 border-b border-[#eee] shrink-0">
          <div class="min-w-0">
            <div class="text-base lg:text-lg font-bold">Заказ №{{ selectedOrder?.id ?? '...' }}</div>
            <div v-if="selectedOrder" class="text-xs lg:text-sm text-[#888] mt-1 truncate">
              {{ customerName(selectedOrder) }}, {{ formatPhone(selectedOrder.customerPhone) }}
            </div>
          </div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl leading-none shrink-0" @click="emit('close')">×</button>
        </div>

        <div v-if="detailsLoading" class="px-4 lg:px-7 py-16 text-center text-[#aaa]">Загрузка...</div>

        <div v-else-if="selectedOrder" class="flex-1 overflow-y-auto">
          <AdminOrderHeader :order="selectedOrder" />

          <AdminOrderEditForm
            v-model:total-amount="totalAmountForm"
            v-model:seller-comment="sellerCommentForm"
            :user-comment="selectedOrder.userComment"
            :can-edit-total="canEditTotalAmount(selectedOrder.status)"
            :saving="editSaving"
            :has-changes="hasOrderEditChanges"
            @save="saveOrderEdits"
          />

          <AdminOrderItemsList
            :items="orderItemsForm"
            :editable="canEditItems(selectedOrder.status)"
            :subtotal="orderItemsSubtotal"
            @update:quantity="setOrderItemQuantity"
            @update:unit-price="setOrderItemUnitPrice"
            @remove="removeOrderItem"
            @add-request="showPicker = true"
          />

          <AdminOrderHistory :history="selectedOrder.history" />
        </div>

        <div v-if="selectedOrder" class="px-4 lg:px-7 py-4 lg:py-5 border-t border-[#eee] flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <div v-if="actionError" class="text-sm text-red-500 sm:mr-auto">{{ actionError }}</div>
          <div v-else class="sm:mr-auto text-xs text-[#aaa]">
            При принятии заказа остатки товаров будут списаны.
          </div>
          <div v-if="availableActions.length" class="flex gap-2 flex-wrap">
            <button
              v-for="action in availableActions"
              :key="action.status"
              class="flex-1 sm:flex-initial px-4 lg:px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              :class="action.class"
              :disabled="!!actionLoading || editSaving"
              @click="setStatus(action.status)"
            >
              {{ actionLoading === action.status ? 'Сохр...' : action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <AdminOrderProductPicker
      v-if="showPicker && adminProducts"
      :products="adminProducts"
      @add="handlePickerAdd"
      @close="showPicker = false"
    />
  </Teleport>
</template>
