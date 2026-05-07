<script setup lang="ts">
import type { OrderDetailsDto, OrderHistoryDto, OrderItemDto, OrderRowDto, OrderStatus, ProductDto } from '~/types/api'
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from '~/types/api'

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active'>

const props = defineProps<{
  orderId: number
  adminProducts: AdminProduct[] | null
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const { formatPrice, formatDate } = useFormatters()

const selectedOrder = ref<OrderDetailsDto | null>(null)
const detailsLoading = ref(false)
const actionLoading = ref<OrderStatus | null>(null)
const editSaving = ref(false)
const actionError = ref('')
const sellerCommentForm = ref('')
const totalAmountForm = ref(0)
const orderItemsForm = ref<OrderItemDto[]>([])
const showPicker = ref(false)

async function loadOrder() {
  detailsLoading.value = true
  actionError.value = ''
  selectedOrder.value = null
  try {
    selectedOrder.value = await $fetch<OrderDetailsDto>(`/api/admin/orders/${props.orderId}`)
    sellerCommentForm.value = selectedOrder.value.sellerComment
    totalAmountForm.value = selectedOrder.value.totalAmount
    orderItemsForm.value = selectedOrder.value.items.map(item => ({ ...item }))
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
  })))

const orderItemsSubtotal = computed(() => orderItemsForm.value
  .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))

const hasOrderItemsChanges = computed(() => {
  if (!selectedOrder.value) return false
  if (!canEditItems(selectedOrder.value.status)) return false
  const original = selectedOrder.value.items
    .filter(item => item.productId)
    .map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice }))
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

function customerName(order: Pick<OrderRowDto, 'customerFirstName' | 'customerLastName'>) {
  return `${order.customerFirstName} ${order.customerLastName}`.trim()
}

function hasComment(value: string) {
  return value.trim().length > 0
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

function handlePickerAdd(items: { productId: number, quantity: number }[]) {
  for (const { productId, quantity } of items) {
    const product = props.adminProducts?.find(p => p.id === productId)
    if (!product) continue
    const existingIndex = orderItemsForm.value.findIndex(item => item.productId === productId)
    if (existingIndex >= 0) {
      setOrderItemQuantity(existingIndex, orderItemsForm.value[existingIndex].quantity + quantity)
    }
    else {
      orderItemsForm.value.push({
        id: -(Date.now() + Math.random()),
        orderId: selectedOrder.value?.id ?? 0,
        productId: product.id,
        productName: product.name,
        productPhoto: product.photos[0] ?? '',
        unitPrice: product.price,
        quantity,
        totalPrice: product.price * quantity,
      } as any)
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
    selectedOrder.value = await $fetch<OrderDetailsDto>(`/api/admin/orders/${updated.id}`)
    sellerCommentForm.value = selectedOrder.value.sellerComment
    totalAmountForm.value = selectedOrder.value.totalAmount
    orderItemsForm.value = selectedOrder.value.items.map(item => ({ ...item }))
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

function historyLabel(entry: OrderHistoryDto) {
  return formatDate(entry.createdAt)
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col shadow-2xl">
        <!-- Header -->
        <div class="flex items-start justify-between px-7 py-5 border-b border-[#eee]">
          <div>
            <div class="text-lg font-bold">Заказ №{{ selectedOrder?.id ?? '...' }}</div>
            <div v-if="selectedOrder" class="text-sm text-[#888] mt-1">
              {{ customerName(selectedOrder) }}, {{ selectedOrder.customerPhone }}
            </div>
          </div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
        </div>

        <div v-if="detailsLoading" class="px-7 py-16 text-center text-[#aaa]">Загрузка...</div>

        <div v-else-if="selectedOrder" class="flex-1 overflow-y-auto">
          <!-- Meta row -->
          <div class="px-7 py-5 grid grid-cols-4 gap-4 border-b border-[#eee]">
            <div>
              <div class="text-xs text-[#888] mb-1">Статус</div>
              <span class="px-2.5 py-1 rounded-lg font-semibold text-xs" :class="ORDER_STATUS_CLASSES[selectedOrder.status]">
                {{ ORDER_STATUS_LABELS[selectedOrder.status] }}
              </span>
            </div>
            <div>
              <div class="text-xs text-[#888] mb-1">Сумма</div>
              <div class="font-bold text-brand">{{ formatPrice(selectedOrder.totalAmount) }}</div>
            </div>
            <div>
              <div class="text-xs text-[#888] mb-1">Создан</div>
              <div class="font-semibold text-[#222]">{{ formatDate(selectedOrder.createdAt) }}</div>
            </div>
            <div>
              <div class="text-xs text-[#888] mb-1">Обновлён</div>
              <div class="font-semibold text-[#222]">{{ formatDate(selectedOrder.updatedAt) }}</div>
            </div>
          </div>

          <!-- Comments + amount -->
          <div class="px-7 py-5 flex flex-col gap-5 border-b border-[#eee]">
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий клиента</label>
              <div class="min-h-[64px] rounded-xl bg-[#f8f8f8] border border-[#eee] px-4 py-3 text-sm text-[#555] leading-relaxed whitespace-pre-wrap">
                {{ hasComment(selectedOrder.userComment) ? selectedOrder.userComment : 'Нет комментария' }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-5 items-start">
              <div>
                <label class="block text-xs font-semibold text-[#777] mb-1.5">Сумма заказа</label>
                <input
                  v-model.number="totalAmountForm"
                  type="number"
                  min="0"
                  :disabled="!canEditTotalAmount(selectedOrder.status)"
                  class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand disabled:bg-[#f7f7f7] disabled:text-[#888]"
                />
                <p v-if="!canEditTotalAmount(selectedOrder.status)" class="text-xs text-[#aaa] mt-1.5">
                  Сумму можно менять только в статусах «Создан», «Принят» или «В работе».
                </p>
              </div>
              <div>
                <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий продавца</label>
                <textarea
                  v-model="sellerCommentForm"
                  rows="3"
                  maxlength="2000"
                  placeholder="Причина изменения суммы, доп. работы, скидка или служебная заметка"
                  class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none"
                />
                <p class="text-xs text-[#aaa] mt-1.5">При изменении суммы комментарий обязателен.</p>
              </div>
            </div>

            <div class="flex justify-end">
              <button
                class="px-5 py-2.5 rounded-xl border-2 border-brand text-brand text-sm font-semibold hover:bg-brand/10 transition-colors disabled:opacity-50"
                :disabled="editSaving || !hasOrderEditChanges"
                @click="saveOrderEdits"
              >
                {{ editSaving ? 'Сохранение...' : 'Сохранить изменения' }}
              </button>
            </div>
          </div>

          <!-- Items -->
          <div class="px-7 py-5 border-b border-[#eee]">
            <h2 class="text-sm font-bold text-[#222] mb-3">Состав заказа</h2>

            <!-- Add item button -->
            <div v-if="canEditItems(selectedOrder.status)" class="mb-3">
              <button
                class="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#ddd] text-sm text-[#777] hover:border-brand hover:text-brand transition-colors w-full justify-center"
                @click="showPicker = true"
              >
                <span class="text-lg leading-none font-bold">+</span>
                Выбрать товары из каталога
              </button>
            </div>

            <div class="border border-[#eee] rounded-xl overflow-hidden">
              <!-- Header row -->
              <div v-if="orderItemsForm.length > 0" class="grid grid-cols-[56px_1fr_100px_80px_110px_auto] gap-3 items-center px-4 py-2 bg-[#fafafa] border-b border-[#eee] text-xs font-semibold text-[#888]">
                <div />
                <div>Товар</div>
                <div class="text-right">Цена, ₽</div>
                <div class="text-right">Кол-во</div>
                <div class="text-right">Итого</div>
                <div v-if="canEditItems(selectedOrder.status)" />
              </div>

              <div
                v-for="(item, index) in orderItemsForm"
                :key="item.id"
                class="grid grid-cols-[56px_1fr_100px_80px_110px_auto] gap-3 items-center px-4 py-3 border-b border-[#f0f0f0] last:border-0"
              >
                <div
                  class="w-14 h-14 rounded-xl bg-center bg-cover bg-[#eee] shrink-0"
                  :style="item.productPhoto ? `background-image: url('${item.productPhoto}')` : ''"
                />
                <div class="font-semibold text-[#222] text-sm leading-snug">{{ item.productName }}</div>
                <div v-if="item.services?.length" class="flex flex-wrap gap-1 mt-1">
                  <span
                    v-for="svc in item.services"
                    :key="svc.name"
                    class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300"
                  >
                    ★ {{ svc.name }} <span class="opacity-70">(+{{ formatPrice(svc.price) }})</span>
                  </span>
                </div>

                <!-- Unit price -->
                <input
                  v-if="canEditItems(selectedOrder.status)"
                  :value="item.unitPrice"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full border border-[#ddd] rounded-xl px-2 py-2 text-sm text-right outline-none focus:border-brand"
                  @input="setOrderItemUnitPrice(index, Number(($event.target as HTMLInputElement).value))"
                />
                <div v-else class="text-sm text-right text-[#555]">{{ formatPrice(item.unitPrice) }}</div>

                <!-- Quantity -->
                <input
                  v-if="canEditItems(selectedOrder.status)"
                  :value="item.quantity"
                  type="number"
                  min="1"
                  step="1"
                  class="w-full border border-[#ddd] rounded-xl px-2 py-2 text-sm text-right outline-none focus:border-brand"
                  @input="setOrderItemQuantity(index, Number(($event.target as HTMLInputElement).value))"
                />
                <div v-else class="text-sm text-right text-[#555]">{{ item.quantity }} шт.</div>

                <div class="font-bold text-[#222] text-right">{{ formatPrice(item.totalPrice) }}</div>

                <button
                  v-if="canEditItems(selectedOrder.status)"
                  class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors"
                  @click="removeOrderItem(index)"
                >
                  Удалить
                </button>
                <div v-else />
              </div>

              <div v-if="orderItemsForm.length === 0" class="px-4 py-8 text-center text-sm text-[#aaa]">
                Добавьте хотя бы одну позицию
              </div>
            </div>

            <div v-if="canEditItems(selectedOrder.status)" class="mt-3 text-right text-sm text-[#555]">
              Сумма по позициям: <span class="font-bold text-brand">{{ formatPrice(orderItemsSubtotal) }}</span>
            </div>
          </div>

          <!-- History -->
          <div class="px-7 py-5">
            <h2 class="text-sm font-bold text-[#222] mb-3">История изменений</h2>
            <div v-if="selectedOrder.history.length === 0" class="text-sm text-[#aaa]">
              История пуста
            </div>
            <div v-else class="flex flex-col gap-0">
              <div
                v-for="entry in selectedOrder.history"
                :key="entry.id"
                class="flex gap-4 items-start py-2.5 border-b border-[#f4f4f4] last:border-0"
              >
                <div class="text-xs text-[#aaa] whitespace-nowrap pt-0.5 min-w-[120px]">{{ historyLabel(entry) }}</div>
                <div class="text-sm text-[#333] leading-snug">{{ entry.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer actions -->
        <div v-if="selectedOrder" class="px-7 py-5 border-t border-[#eee] flex items-center gap-3">
          <div v-if="actionError" class="text-sm text-red-500 mr-auto">{{ actionError }}</div>
          <div v-else class="mr-auto text-xs text-[#aaa]">
            При принятии заказа остатки товаров будут списаны.
          </div>
          <button
            v-for="action in availableActions"
            :key="action.status"
            class="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            :class="action.class"
            :disabled="!!actionLoading || editSaving"
            @click="setStatus(action.status)"
          >
            {{ actionLoading === action.status ? 'Сохранение...' : action.label }}
          </button>
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
