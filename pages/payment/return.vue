<script setup lang="ts">
import type { PaymentStatus } from '~/types/api'

definePageMeta({ middleware: 'account' })
useHead({ title: 'Острый край — Статус оплаты' })

const route = useRoute()
const orderId = Number(route.query.order_id)

interface OrderPaymentInfo {
  id: number
  paymentStatus: PaymentStatus
  totalAmount: number
}

const { data: order, pending } = await useFetch<OrderPaymentInfo>(`/api/account/orders/${orderId}`)
</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)] flex items-center justify-center py-16 px-4">
    <div class="bg-white rounded-2xl shadow-sm p-8 max-w-[480px] w-full text-center">

      <div v-if="pending" class="flex justify-center py-8">
        <div class="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>

      <template v-else-if="order?.paymentStatus === 'paid'">
        <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-[#111] mb-2">Оплата прошла успешно</h1>
        <p class="text-[#666] mb-6">Заказ №{{ order.id }} оплачен. Мы уже приступаем к его обработке.</p>
        <NuxtLink to="/account?tab=orders" class="btn-primary inline-block px-8 py-3">
          Перейти к заказам
        </NuxtLink>
      </template>

      <template v-else-if="order?.paymentStatus === 'failed'">
        <div class="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-[#111] mb-2">Оплата не прошла</h1>
        <p class="text-[#666] mb-6">Попробуйте снова в личном кабинете.</p>
        <NuxtLink to="/account?tab=orders" class="btn-primary inline-block px-8 py-3">
          Перейти к заказам
        </NuxtLink>
      </template>

      <template v-else>
        <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-[#111] mb-2">Обрабатываем платёж</h1>
        <p class="text-[#666] mb-6">
          Статус оплаты обновится в ближайшее время. Проверьте личный кабинет.
        </p>
        <NuxtLink to="/account?tab=orders" class="btn-primary inline-block px-8 py-3">
          Перейти к заказам
        </NuxtLink>
      </template>

    </div>
  </main>
</template>
