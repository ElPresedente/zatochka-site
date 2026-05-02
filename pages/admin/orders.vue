<script setup lang="ts">
import type { OrderRowDto, ProductDto } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Заказы' })

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active'>

const { data: orders, refresh } = await useFetch<OrderRowDto[]>('/api/admin/orders')
const { data: adminProducts } = await useFetch<AdminProduct[]>('/api/admin/products')

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
    <span class="text-sm text-[#aaa]">{{ orders?.length ?? 0 }} заказов</span>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    <AdminOrdersTable :orders="orders" @select="openOrder" />
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
