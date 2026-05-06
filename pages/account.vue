<script setup lang="ts">
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from '~/types/api'
import type { OrderItemDto } from '~/types/api'
import type { OrderStatus } from '~/server/db/schema'

definePageMeta({ middleware: 'account' })
useHead({ title: 'Острый край — Личный кабинет' })

interface ProfileDto {
  id: number
  firstName: string
  lastName: string
  phone: string
}

interface OrderWithItems {
  id: number
  status: OrderStatus
  totalAmount: number
  userComment: string
  sellerComment: string
  customerFirstName: string
  customerLastName: string
  customerPhone: string
  createdAt: string
  updatedAt: string
  items: OrderItemDto[]
}

const { formatPrice } = useFormatters()
const { fetchUser } = useAuth()

const route = useRoute()
const tab = ref<'profile' | 'orders'>(route.query.tab === 'orders' ? 'orders' : 'profile')

const { data: profile, refresh: refreshProfile } = await useFetch<ProfileDto>('/api/account/profile')
const { data: myOrders, pending: ordersPending } = await useFetch<OrderWithItems[]>('/api/account/orders')

const form = reactive({
  firstName: profile.value?.firstName ?? '',
  lastName: profile.value?.lastName ?? '',
})

watch(profile, (p) => {
  if (p) { form.firstName = p.firstName; form.lastName = p.lastName }
})

const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

async function saveProfile() {
  saving.value = true
  saveError.value = ''
  saveSuccess.value = false
  try {
    await $fetch('/api/account/profile', {
      method: 'PATCH',
      body: { firstName: form.firstName.trim(), lastName: form.lastName.trim() },
    })
    await Promise.all([refreshProfile(), fetchUser(true)])
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 3000)
  } catch (e: any) {
    saveError.value = e?.data?.message ?? 'Ошибка при сохранении'
  } finally {
    saving.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)]">
    <div class="max-w-[960px] mx-auto px-6 py-10">

      <!-- Page header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-[#111]">Личный кабинет</h1>
        <p v-if="profile" class="text-[#777] mt-1">
          {{ profile.lastName }} {{ profile.firstName }}
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm w-fit">
        <button
          class="px-5 py-2 rounded-xl font-semibold text-base transition-all"
          :class="tab === 'profile' ? 'bg-brand text-white shadow' : 'text-[#555] hover:text-brand'"
          @click="tab = 'profile'"
        >Профиль</button>
        <button
          class="px-5 py-2 rounded-xl font-semibold text-base transition-all flex items-center gap-2"
          :class="tab === 'orders' ? 'bg-brand text-white shadow' : 'text-[#555] hover:text-brand'"
          @click="tab = 'orders'"
        >
          Мои заказы
          <span
            v-if="myOrders?.length"
            class="text-xs font-bold px-1.5 py-0.5 rounded-full"
            :class="tab === 'orders' ? 'bg-white/30' : 'bg-brand/10 text-brand'"
          >{{ myOrders.length }}</span>
        </button>
      </div>

      <!-- Profile tab -->
      <div v-if="tab === 'profile'">
        <div class="bg-white rounded-2xl shadow-sm p-8 max-w-[540px]">
          <h2 class="text-xl font-bold text-[#111] mb-6">Личные данные</h2>

          <form class="flex flex-col gap-5" @submit.prevent="saveProfile">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-semibold text-[#555]">Фамилия</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  required
                  class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand transition-colors"
                  placeholder="Иванов"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-semibold text-[#555]">Имя</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  required
                  class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand transition-colors"
                  placeholder="Иван"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-semibold text-[#555]">Телефон</label>
              <input
                :value="profile?.phone"
                type="tel"
                readonly
                class="border border-[#eee] rounded-xl px-4 py-2.5 text-base bg-[#fafafa] text-[#888] cursor-not-allowed"
              />
              <p class="text-xs text-[#aaa]">Телефон используется для входа и не может быть изменён</p>
            </div>

            <div class="flex items-center gap-4 pt-1">
              <button
                type="submit"
                class="btn-primary px-8 py-2.5 text-base disabled:opacity-50"
                :disabled="saving"
              >{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
              <Transition name="hint-fade">
                <span v-if="saveSuccess" class="text-green-600 font-semibold text-sm">Данные сохранены</span>
                <span v-else-if="saveError" class="text-red-500 text-sm">{{ saveError }}</span>
              </Transition>
            </div>
          </form>
        </div>
      </div>

      <!-- Orders tab -->
      <div v-else-if="tab === 'orders'">
        <div v-if="ordersPending" class="flex justify-center py-20">
          <div class="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        </div>

        <div v-else-if="!myOrders?.length" class="flex flex-col items-center py-20 text-[#aaa] gap-3">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p class="text-lg">Заказов пока нет</p>
          <NuxtLink to="/shop" class="text-brand font-semibold hover:underline">Перейти в магазин</NuxtLink>
        </div>

        <div v-else class="flex flex-col gap-4">
          <div
            v-for="order in myOrders"
            :key="order.id"
            class="bg-white rounded-2xl shadow-sm overflow-hidden"
          >
            <!-- Order header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
              <div class="flex items-center gap-3">
                <span class="font-bold text-[#111] text-lg">Заказ #{{ order.id }}</span>
                <span
                  class="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  :class="ORDER_STATUS_CLASSES[order.status]"
                >{{ ORDER_STATUS_LABELS[order.status] }}</span>
              </div>
              <span class="text-sm text-[#888]">{{ formatDate(order.createdAt) }}</span>
            </div>

            <!-- Items -->
            <div class="px-6 py-4 flex flex-col gap-3">
              <div
                v-for="item in order.items"
                :key="item.id"
                class="flex items-center gap-3"
              >
                <div
                  class="w-12 h-12 rounded-lg bg-center bg-cover bg-[#f0f0f0] shrink-0"
                  :style="item.productPhoto ? `background-image: url('${item.productPhoto}')` : ''"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold text-[#222] truncate">{{ item.productName }}</div>
                  <div class="text-xs text-[#888]">{{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</div>
                </div>
                <div class="text-sm font-bold text-[#222] shrink-0">{{ formatPrice(item.totalPrice) }}</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-[#f0f0f0] px-6 py-4 flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <span class="text-[#888] text-sm">Итого</span>
                <span class="text-xl font-bold text-brand">{{ formatPrice(order.totalAmount) }}</span>
              </div>

              <div v-if="order.userComment" class="text-sm text-[#666] bg-[#fafafa] rounded-xl px-4 py-2.5 mt-1">
                <span class="font-semibold text-[#444]">Ваш комментарий: </span>{{ order.userComment }}
              </div>

              <div v-if="order.sellerComment" class="text-sm text-[#444] bg-brand/5 border border-brand/20 rounded-xl px-4 py-2.5">
                <span class="font-semibold text-brand">Комментарий мастерской: </span>{{ order.sellerComment }}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </main>
</template>

<style scoped>
.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity 0.2s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }
</style>
