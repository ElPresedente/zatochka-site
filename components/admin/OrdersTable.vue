<script setup lang="ts">
import type { OrderRowDto } from '~/types/api'
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from '~/types/api'

defineProps<{ orders: OrderRowDto[] | null }>()
const emit = defineEmits<{ select: [order: OrderRowDto] }>()

const { formatPrice, formatDate, formatPhone } = useFormatters()

function customerName(order: Pick<OrderRowDto, 'customerFirstName' | 'customerLastName'>) {
  return `${order.customerFirstName} ${order.customerLastName}`.trim()
}
</script>

<template>
  <div>
    <!-- Desktop: table -->
    <div class="hidden lg:block bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
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
            @click="emit('select', order)"
          >
            <td class="px-5 py-4 font-bold text-[#222]">№{{ order.id }}</td>
            <td class="px-5 py-4 font-semibold text-[#222]">{{ customerName(order) }}</td>
            <td class="px-5 py-4 text-[#555]">{{ formatPhone(order.customerPhone) }}</td>
            <td class="px-5 py-4 font-bold text-brand">{{ formatPrice(order.totalAmount) }}</td>
            <td class="px-5 py-4 text-[#777]">{{ formatDate(order.createdAt) }}</td>
            <td class="px-5 py-4">
              <span class="px-2.5 py-1 rounded-lg font-semibold text-xs" :class="ORDER_STATUS_CLASSES[order.status]">
                {{ ORDER_STATUS_LABELS[order.status] }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!orders?.length" class="py-16 text-center text-[#aaa]">Заказов пока нет</div>
    </div>

    <!-- Mobile: cards -->
    <div class="lg:hidden flex flex-col gap-3">
      <div
        v-for="order in orders"
        :key="order.id"
        class="bg-white rounded-2xl shadow-sm border border-[#eee] p-4 flex flex-col gap-2 cursor-pointer hover:border-brand transition-colors"
        @click="emit('select', order)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="font-bold text-[#222]">№{{ order.id }}</div>
          <span class="px-2 py-0.5 rounded-lg font-semibold text-[10px] whitespace-nowrap shrink-0" :class="ORDER_STATUS_CLASSES[order.status]">
            {{ ORDER_STATUS_LABELS[order.status] }}
          </span>
        </div>
        <div class="font-semibold text-[#222] text-sm">{{ customerName(order) }}</div>
        <div class="text-sm text-[#555]">{{ formatPhone(order.customerPhone) }}</div>
        <div class="flex items-center justify-between gap-2 mt-1">
          <span class="text-xs text-[#888]">{{ formatDate(order.createdAt) }}</span>
          <span class="font-bold text-brand">{{ formatPrice(order.totalAmount) }}</span>
        </div>
      </div>
      <div v-if="!orders?.length" class="bg-white rounded-2xl border border-[#eee] py-12 text-center text-[#aaa]">Заказов пока нет</div>
    </div>
  </div>
</template>
