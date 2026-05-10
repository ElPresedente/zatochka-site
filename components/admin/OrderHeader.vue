<script setup lang="ts">
import type { OrderDetailsDto } from '~/types/api'
import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS } from '~/types/api'

defineProps<{
  order: OrderDetailsDto
}>()

const { formatPrice, formatDate } = useFormatters()
</script>

<template>
  <div class="px-4 lg:px-7 py-4 lg:py-5 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 border-b border-[#eee]">
    <div>
      <div class="text-xs text-[#888] mb-1">Статус</div>
      <span class="px-2.5 py-1 rounded-lg font-semibold text-xs" :class="ORDER_STATUS_CLASSES[order.status]">
        {{ ORDER_STATUS_LABELS[order.status] }}
      </span>
    </div>
    <div>
      <div class="text-xs text-[#888] mb-1">Сумма</div>
      <div class="font-bold text-brand">{{ formatPrice(order.totalAmount) }}</div>
    </div>
    <div>
      <div class="text-xs text-[#888] mb-1">Создан</div>
      <div class="font-semibold text-[#222]">{{ formatDate(order.createdAt) }}</div>
    </div>
    <div>
      <div class="text-xs text-[#888] mb-1">Обновлён</div>
      <div class="font-semibold text-[#222]">{{ formatDate(order.updatedAt) }}</div>
    </div>
  </div>
</template>
