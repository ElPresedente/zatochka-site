<script setup lang="ts">
import type { OrderRowDto } from '~/types/api'
import {
  DELIVERY_METHOD_LABELS,
  DELIVERY_SCOPE_LABELS,
  EXTRA_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_CLASSES,
  PAYMENT_STATUS_LABELS,
} from '~/types/api'

const props = defineProps<{ order: OrderRowDto }>()
const { formatPrice, formatDate } = useFormatters()

// Прямая ссылка на платёж в ЛК ЮKassa для сверки/возврата.
const yookassaUrl = computed(() =>
  props.order.yookassaPaymentId
    ? `https://yookassa.ru/my/payments/${props.order.yookassaPaymentId}`
    : null,
)

const copied = ref<string | null>(null)
async function copy(value: string, key: string) {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = key
    setTimeout(() => { if (copied.value === key) copied.value = null }, 1500)
  }
  catch { /* clipboard недоступен */ }
}
</script>

<template>
  <div class="px-4 lg:px-7 py-4 lg:py-5 grid grid-cols-1 sm:grid-cols-2 gap-5 border-b border-[#eee]">
    <!-- Оплата -->
    <div class="space-y-2.5">
      <div class="text-xs font-semibold uppercase tracking-wide text-[#aaa]">Оплата</div>

      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm text-[#222] font-semibold">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</span>
        <span class="px-2 py-0.5 rounded-lg font-semibold text-xs" :class="PAYMENT_STATUS_CLASSES[order.paymentStatus]">
          {{ PAYMENT_STATUS_LABELS[order.paymentStatus] }}
        </span>
      </div>

      <div v-if="order.paidAt" class="text-xs text-[#888]">
        Оплачен: <span class="text-[#555]">{{ formatDate(order.paidAt) }}</span>
      </div>

      <a
        v-if="yookassaUrl"
        :href="yookassaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-xs text-brand hover:underline"
      >
        Платёж в ЮKassa ↗
      </a>

      <div v-if="order.extraPaymentStatus !== 'none'" class="text-xs text-[#888]">
        Доплата:
        <span class="text-[#555]">
          {{ EXTRA_PAYMENT_STATUS_LABELS[order.extraPaymentStatus] }}
          <template v-if="order.extraPaymentAmount"> · {{ formatPrice(order.extraPaymentAmount) }}</template>
        </span>
      </div>
    </div>

    <!-- Доставка -->
    <div class="space-y-2.5">
      <div class="text-xs font-semibold uppercase tracking-wide text-[#aaa]">Доставка</div>

      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm text-[#222] font-semibold">{{ DELIVERY_METHOD_LABELS[order.deliveryMethod] }}</span>
        <span
          v-if="order.deliveryMethod === 'delivery' && order.deliveryScope"
          class="px-2 py-0.5 rounded-lg font-semibold text-xs bg-blue-50 text-blue-700"
        >
          {{ DELIVERY_SCOPE_LABELS[order.deliveryScope] }}
        </span>
      </div>

      <div v-if="order.deliveryMethod === 'delivery'" class="text-xs text-[#888]">
        Стоимость:
        <span class="text-[#555]">{{ order.deliveryCost > 0 ? formatPrice(order.deliveryCost) : 'бесплатно' }}</span>
      </div>

      <!-- Доставка по Орлу -->
      <div
        v-if="order.deliveryMethod === 'delivery' && order.deliveryScope === 'orel' && order.deliveryAddress"
        class="text-xs text-[#888]"
      >
        Адрес: <span class="text-[#555]">{{ order.deliveryAddress }}</span>
      </div>

      <!-- Доставка по России (СДЭК) -->
      <template v-if="order.deliveryMethod === 'delivery' && order.deliveryScope === 'russia'">
        <div v-if="order.cdekPvzAddress || order.cdekPvzCity" class="text-xs text-[#888]">
          ПВЗ:
          <span class="text-[#555]">
            {{ [order.cdekPvzCity, order.cdekPvzAddress].filter(Boolean).join(', ') }}
            <template v-if="order.cdekPvzCode"> ({{ order.cdekPvzCode }})</template>
          </span>
        </div>
        <div v-if="order.cdekDeliveryDaysMin != null" class="text-xs text-[#888]">
          Срок: <span class="text-[#555]">{{ order.cdekDeliveryDaysMin }}–{{ order.cdekDeliveryDaysMax }} дн.</span>
        </div>
        <div class="text-xs text-[#888] flex items-center gap-1.5 flex-wrap">
          Заказ СДЭК:
          <template v-if="order.cdekOrderUuid">
            <span class="text-[#555] font-mono break-all">{{ order.cdekOrderUuid }}</span>
            <button class="text-brand hover:underline shrink-0" @click="order.cdekOrderUuid && copy(order.cdekOrderUuid, 'cdek')">
              {{ copied === 'cdek' ? 'скопировано' : 'копировать' }}
            </button>
          </template>
          <span v-else class="text-[#bbb]">не создан</span>
        </div>
      </template>
    </div>
  </div>
</template>
