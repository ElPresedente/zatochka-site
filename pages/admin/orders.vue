<script setup lang="ts">
import type { OrderRowDto, OrderStatus, ProductDto } from '~/types/api'
import { ORDER_STATUS_LABELS } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Заказы' })

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active' | 'services'>

interface OrdersPage {
  orders: OrderRowDto[]
  total: number
  page: number
  pageCount: number
}

const STATUS_OPTIONS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Все статусы' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value: value as OrderStatus,
    label,
  })),
]

const page = ref(1)
const statusFilter = ref<OrderStatus | ''>('')

watch(statusFilter, () => { page.value = 1 })

const { data: ordersPage, refresh } = await useFetch<OrdersPage>('/api/admin/orders', {
  query: { page, status: statusFilter },
})
const { data: adminProducts } = await useFetch<AdminProduct[]>('/api/admin/products')

const orders = computed(() => ordersPage.value?.orders ?? [])
const total = computed(() => ordersPage.value?.total ?? 0)
const pageCount = computed(() => ordersPage.value?.pageCount ?? 1)

const selectedOrderId = ref<number | null>(null)

function openOrder(order: OrderRowDto) {
  selectedOrderId.value = order.id
}

function closeOrder() {
  selectedOrderId.value = null
}

async function onChanged() {
  await refresh()
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-8 py-5 flex items-center justify-between shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Заказы</h1>
    <div class="flex items-center gap-4">
      <select
        v-model="statusFilter"
        class="border border-[#ddd] rounded-lg px-3 py-1.5 text-sm text-[#444] outline-none focus:border-brand transition-colors"
      >
        <option v-for="opt in STATUS_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <span class="text-sm text-[#aaa]">{{ total }} заказов</span>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">
    <AdminOrdersTable :orders="orders" @select="openOrder" />

    <div v-if="pageCount > 1" class="flex items-center justify-center gap-4 py-2">
      <button
        class="px-4 py-2 rounded-lg border border-[#ddd] text-sm text-[#555] disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
        :disabled="page <= 1"
        @click="page--"
      >
        ← Назад
      </button>
      <span class="text-sm text-[#777]">Страница {{ page }} из {{ pageCount }}</span>
      <button
        class="px-4 py-2 rounded-lg border border-[#ddd] text-sm text-[#555] disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
        :disabled="page >= pageCount"
        @click="page++"
      >
        Вперёд →
      </button>
    </div>
  </div>

  <AdminOrderEditModal
    v-if="selectedOrderId !== null"
    :key="selectedOrderId"
    :order-id="selectedOrderId"
    :admin-products="adminProducts"
    @close="closeOrder"
    @changed="onChanged"
  />
</template>
