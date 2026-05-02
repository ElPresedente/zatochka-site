<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Заказы' })

type OrderStatus = 'created' | 'cancelled' | 'accepted' | 'in_progress' | 'ready' | 'completed'

interface OrderRow {
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

interface OrderItem {
  id: number
  orderId: number
  productId: number | null
  productName: string
  productPhoto: string
  unitPrice: number
  quantity: number
  totalPrice: number
}

interface OrderDetails extends OrderRow {
  items: OrderItem[]
}

const { data: orders, refresh } = await useFetch<OrderRow[]>('/api/admin/orders')

const selectedOrder = ref<OrderDetails | null>(null)
const detailsOpen = ref(false)
const detailsLoading = ref(false)
const actionLoading = ref<OrderStatus | null>(null)
const editSaving = ref(false)
const actionError = ref('')
const sellerCommentForm = ref('')
const totalAmountForm = ref(0)

const statusLabels: Record<OrderStatus, string> = {
  created: 'Создан',
  cancelled: 'Отменен',
  accepted: 'Принят',
  in_progress: 'В работе',
  ready: 'Готов к выдаче',
  completed: 'Завершен',
}

const statusClasses: Record<OrderStatus, string> = {
  created: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-600',
  accepted: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  ready: 'bg-purple-100 text-purple-700',
  completed: 'bg-slate-100 text-slate-600',
}

async function openOrder(order: OrderRow) {
  detailsOpen.value = true
  detailsLoading.value = true
  actionError.value = ''
  selectedOrder.value = null
  try {
    selectedOrder.value = await $fetch<OrderDetails>(`/api/admin/orders/${order.id}`)
    sellerCommentForm.value = selectedOrder.value.sellerComment
    totalAmountForm.value = selectedOrder.value.totalAmount
  } finally {
    detailsLoading.value = false
  }
}

function closeOrder() {
  detailsOpen.value = false
  selectedOrder.value = null
  actionError.value = ''
  sellerCommentForm.value = ''
  totalAmountForm.value = 0
}

const hasOrderEditChanges = computed(() => {
  if (!selectedOrder.value) return false
  return sellerCommentForm.value.trim() !== selectedOrder.value.sellerComment
    || totalAmountForm.value !== selectedOrder.value.totalAmount
})

async function saveOrderEdits() {
  if (!selectedOrder.value || !hasOrderEditChanges.value) return true

  editSaving.value = true
  actionError.value = ''
  try {
    const updated = await $fetch<OrderRow>(`/api/admin/orders/${selectedOrder.value.id}`, {
      method: 'PUT',
      body: {
        sellerComment: sellerCommentForm.value,
        totalAmount: totalAmountForm.value,
      },
    })
    selectedOrder.value = { ...selectedOrder.value, ...updated }
    sellerCommentForm.value = selectedOrder.value.sellerComment
    totalAmountForm.value = selectedOrder.value.totalAmount
    await refresh()
    return true
  } catch (err: any) {
    actionError.value = err?.data?.message ?? 'Не удалось сохранить изменения'
    return false
  } finally {
    editSaving.value = false
  }
}

async function setStatus(status: OrderStatus) {
  if (!selectedOrder.value) return

  actionLoading.value = status
  actionError.value = ''
  try {
    if (!await saveOrderEdits()) return

    const updated = await $fetch<OrderRow>(`/api/admin/orders/${selectedOrder.value.id}/status`, {
      method: 'PUT',
      body: { status },
    })
    selectedOrder.value = { ...selectedOrder.value, ...updated }
    await refresh()
    closeOrder()
  } catch (err: any) {
    actionError.value = err?.data?.message ?? 'Не удалось изменить статус'
  } finally {
    actionLoading.value = null
  }
}

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

function formatPrice(value: number) {
  return value.toLocaleString('ru-RU') + ' ₽'
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function customerName(order: Pick<OrderRow, 'customerFirstName' | 'customerLastName'>) {
  return `${order.customerFirstName} ${order.customerLastName}`.trim()
}

function hasComment(value: string) {
  return value.trim().length > 0
}

function canEditTotalAmount(status: OrderStatus) {
  return status === 'created' || status === 'in_progress'
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-8 py-5 flex items-center justify-between shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Заказы</h1>
    <span class="text-sm text-[#aaa]">{{ orders?.length ?? 0 }} заказов</span>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    <div class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-[#f8f8f8] border-b border-[#eee]">
          <tr>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">ID</th>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">Клиент</th>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">Телефон</th>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">Сумма</th>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">Дата и время</th>
            <th class="text-left px-5 py-3 font-semibold text-[#555]">Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="order in orders"
            :key="order.id"
            class="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors cursor-pointer"
            @click="openOrder(order)"
          >
            <td class="px-5 py-4 font-bold text-[#222]">№{{ order.id }}</td>
            <td class="px-5 py-4 font-semibold text-[#222]">{{ customerName(order) }}</td>
            <td class="px-5 py-4 text-[#555]">{{ order.customerPhone }}</td>
            <td class="px-5 py-4 font-bold text-brand">{{ formatPrice(order.totalAmount) }}</td>
            <td class="px-5 py-4 text-[#777]">{{ formatDate(order.createdAt) }}</td>
            <td class="px-5 py-4">
              <span class="px-2.5 py-1 rounded-lg font-semibold text-xs" :class="statusClasses[order.status]">
                {{ statusLabels[order.status] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!orders?.length" class="py-16 text-center text-[#aaa]">Заказов пока нет</div>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="detailsOpen"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
      @click.self="closeOrder"
    >
      <div class="bg-white rounded-2xl w-full max-w-[820px] max-h-[90vh] flex flex-col shadow-2xl">
        <div class="flex items-start justify-between px-7 py-5 border-b border-[#eee]">
          <div>
            <div class="text-lg font-bold">Заказ №{{ selectedOrder?.id ?? '...' }}</div>
            <div v-if="selectedOrder" class="text-sm text-[#888] mt-1">
              {{ customerName(selectedOrder) }}, {{ selectedOrder.customerPhone }}
            </div>
          </div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="closeOrder">×</button>
        </div>

        <div v-if="detailsLoading" class="px-7 py-16 text-center text-[#aaa]">Загрузка...</div>

        <div v-else-if="selectedOrder" class="flex-1 overflow-y-auto">
          <div class="px-7 py-5 grid grid-cols-4 gap-4 border-b border-[#eee]">
            <div>
              <div class="text-xs text-[#888] mb-1">Статус</div>
              <span class="px-2.5 py-1 rounded-lg font-semibold text-xs" :class="statusClasses[selectedOrder.status]">
                {{ statusLabels[selectedOrder.status] }}
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
              <div class="text-xs text-[#888] mb-1">Обновлен</div>
              <div class="font-semibold text-[#222]">{{ formatDate(selectedOrder.updatedAt) }}</div>
            </div>
          </div>

          <div class="px-7 py-5 flex flex-col gap-5 border-b border-[#eee]">
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий клиента</label>
              <div class="min-h-[110px] rounded-xl bg-[#f8f8f8] border border-[#eee] px-4 py-3 text-sm text-[#555] leading-relaxed whitespace-pre-wrap">
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
                Сумму можно менять только в статусах «Создан» или «В работе».
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
              <p class="text-xs text-[#aaa] mt-1.5">
                Если сумма изменена, комментарий продавца обязателен.
              </p>
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

          <div class="px-7 py-5">
            <h2 class="text-sm font-bold text-[#222] mb-3">Состав заказа</h2>
            <div class="border border-[#eee] rounded-xl overflow-hidden">
              <div
                v-for="item in selectedOrder.items"
                :key="item.id"
                class="flex items-center gap-4 px-4 py-3 border-b border-[#f0f0f0] last:border-0"
              >
                <div
                  class="w-14 h-14 rounded-xl bg-center bg-cover bg-[#eee] shrink-0"
                  :style="item.productPhoto ? `background-image: url('${item.productPhoto}')` : ''"
                />
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-[#222]">{{ item.productName }}</div>
                  <div class="text-sm text-[#888]">{{ formatPrice(item.unitPrice) }} × {{ item.quantity }} шт.</div>
                </div>
                <div class="font-bold text-[#222]">{{ formatPrice(item.totalPrice) }}</div>
              </div>
            </div>
          </div>
        </div>

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
  </Teleport>
</template>
