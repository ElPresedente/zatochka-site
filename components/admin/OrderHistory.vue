<script setup lang="ts">
import type { OrderHistoryDto } from '~/types/api'

defineProps<{
  history: OrderHistoryDto[]
}>()

const { formatDate } = useFormatters()
</script>

<template>
  <div class="px-4 lg:px-7 py-4 lg:py-5">
    <h2 class="text-sm font-bold text-[#222] mb-3">История изменений</h2>
    <div v-if="history.length === 0" class="text-sm text-[#aaa]">
      История пуста
    </div>
    <div v-else class="flex flex-col gap-0">
      <div
        v-for="entry in history"
        :key="entry.id"
        class="flex flex-col sm:flex-row sm:gap-4 sm:items-start py-2.5 border-b border-[#f4f4f4] last:border-0"
      >
        <div class="text-xs text-[#aaa] whitespace-nowrap pt-0.5 sm:min-w-[120px]">{{ formatDate(entry.createdAt) }}</div>
        <div class="text-sm text-[#333] leading-snug">{{ entry.description }}</div>
      </div>
    </div>
  </div>
</template>
