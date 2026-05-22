<script setup lang="ts">
import { ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES } from '~/types/api'
import type { OrderHistoryDto, OrderItemDto } from '~/types/api'
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
  history: OrderHistoryDto[]
}

const { formatPrice, formatDate, formatPhone } = useFormatters()
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


</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)]">
    <div class="max-w-[960px] mx-auto px-4 lg:px-6 py-8 lg:py-10">

      <!-- Page header -->
      <div class="mb-6 lg:mb-8">
        <h1 class="text-2xl lg:text-3xl font-bold text-[#111]">Личный кабинет</h1>
        <p v-if="profile" class="text-[#777] mt-1 text-sm lg:text-base">
          {{ profile.lastName }} {{ profile.firstName }}
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-white rounded-2xl p-1.5 shadow-sm w-fit max-w-full">
        <button
          class="px-4 lg:px-5 py-2 rounded-xl font-semibold text-sm lg:text-base transition-all"
          :class="tab === 'profile' ? 'bg-brand text-white shadow' : 'text-[#555] hover:text-brand'"
          @click="tab = 'profile'"
        >Профиль</button>
        <button
          class="px-4 lg:px-5 py-2 rounded-xl font-semibold text-sm lg:text-base transition-all flex items-center gap-2"
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
        <div class="bg-white rounded-2xl shadow-sm p-5 lg:p-8 max-w-[540px]">
          <h2 class="text-lg lg:text-xl font-bold text-[#111] mb-5 lg:mb-6">Личные данные</h2>

          <form class="flex flex-col gap-4 lg:gap-5" @submit.prevent="saveProfile">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                :value="profile?.phone ? formatPhone(profile.phone) : ''"
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
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 lg:px-6 py-3 lg:py-4 border-b border-[#f0f0f0]">
              <div class="flex items-center gap-2 lg:gap-3 flex-wrap">
                <span class="font-bold text-[#111] text-base lg:text-lg">Заказ #{{ order.id }}</span>
                <span
                  class="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  :class="ORDER_STATUS_CLASSES[order.status]"
                >{{ ORDER_STATUS_LABELS[order.status] }}</span>
              </div>
              <span class="text-xs lg:text-sm text-[#888]">{{ formatDate(order.createdAt) }}</span>
            </div>

            <!-- Items -->
            <div class="px-4 lg:px-6 py-3 lg:py-4 flex flex-col gap-3">
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
                  <div v-if="item.services?.length" class="flex flex-wrap gap-1 mt-0.5 mb-1">
                    <span
                      v-for="svc in item.services"
                      :key="svc.name"
                      class="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium"
                    >+ {{ svc.name }}</span>
                  </div>
                  <div class="text-xs text-[#888]">{{ formatPrice(item.unitPrice) }} × {{ item.quantity }}</div>
                </div>
                <div class="text-sm font-bold text-[#222] shrink-0">{{ formatPrice(item.totalPrice) }}</div>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-[#f0f0f0] px-4 lg:px-6 py-3 lg:py-4 flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <span class="text-[#888] text-sm">Итого</span>
                <span class="text-lg lg:text-xl font-bold text-brand">{{ formatPrice(order.totalAmount) }}</span>
              </div>

              <div v-if="order.userComment" class="text-sm text-[#666] bg-[#fafafa] rounded-xl px-4 py-2.5 mt-1">
                <span class="font-semibold text-[#444]">Ваш комментарий: </span>{{ order.userComment }}
              </div>

              <div v-if="order.sellerComment" class="text-sm text-[#444] bg-brand/5 border border-brand/20 rounded-xl px-4 py-2.5">
                <span class="font-semibold text-brand">Комментарий мастерской: </span>{{ order.sellerComment }}
              </div>
            </div>

            <!-- History -->
            <div v-if="order.history.length > 0" class="border-t border-[#f0f0f0] px-4 lg:px-6 py-3 lg:py-4">
              <div class="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-3">История</div>
              <div class="flex flex-col">
                <div
                  v-for="entry in order.history"
                  :key="entry.id"
                  class="flex flex-col sm:flex-row sm:gap-3 sm:items-start py-2 border-b border-[#f4f4f4] last:border-0"
                >
                  <div class="text-xs text-[#bbb] whitespace-nowrap pt-0.5 sm:min-w-[110px]">{{ formatDate(entry.createdAt) }}</div>
                  <div class="text-sm text-[#555] leading-snug">{{ entry.description }}</div>
                </div>
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
