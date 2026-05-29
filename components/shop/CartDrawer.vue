<script setup lang="ts">
import type { CartItem } from '~/composables/useCart'

const props = defineProps<{
  cart: CartItem[]
  totalPrice: number
  comment: string
  authRequired: boolean
  authenticated: boolean
  loading: boolean
  error: string
  productStock: (id: number) => number
  pickupAddress?: string
  userEmail?: string | null
}>()

const emit = defineEmits<{
  close: []
  setQty: [cartKey: string, qty: number, stock: number]
  remove: [cartKey: string]
  clear: []
  checkout: [paymentMethod: 'cash' | 'online_card', email: string]
  'update:comment': [value: string]
}>()

const { formatPrice } = useFormatters()
const deliveryType = ref<'pickup' | 'delivery'>('pickup')
const paymentMethod = ref<'cash' | 'online_card'>('online_card')
const emailInput = ref('')
const emailTouched = ref(false)

watch(() => props.userEmail, (val) => {
  if (val && !emailInput.value) emailInput.value = val
}, { immediate: true })

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.value.trim()))
const emailError = computed(() => emailTouched.value && paymentMethod.value === 'online_card' && !emailValid.value)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[200]" @click.self="emit('close')">
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div class="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-white shadow-2xl flex flex-col">
        <div class="flex items-center justify-between px-4 lg:px-6 py-4 lg:py-5 border-b border-[#eee]">
          <div class="text-lg lg:text-xl font-bold">Корзина</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl w-8 h-8 flex items-center justify-center" @click="emit('close')">×</button>
        </div>

        <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center text-[#aaa] gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="text-lg">Корзина пуста</span>
        </div>

        <div v-else class="flex-1 overflow-y-auto px-4 lg:px-6 py-3 lg:py-4 flex flex-col gap-4">
          <div v-for="item in cart" :key="item.cartKey" class="flex gap-3 items-start">
            <div
              class="w-14 h-14 lg:w-16 lg:h-16 rounded-xl bg-center bg-cover bg-[#f0f0f0] shrink-0"
              :style="`background-image: url('${item.photo || '/images/nofoto.jpg'}')`"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-[#222] leading-snug mb-0.5 line-clamp-2">{{ item.name }}</div>
              <!-- Services list -->
              <div v-if="item.services.length > 0" class="flex flex-col gap-0.5 mb-1">
                <span
                  v-for="svc in item.services"
                  :key="svc.id"
                  class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit font-medium"
                >+ {{ svc.name }}</span>
              </div>
              <div class="text-brand font-bold">{{ formatPrice(item.price) }}</div>
              <div class="mt-2">
                <ShopQtyInput
                  :qty="item.qty"
                  :stock="productStock(item.id)"
                  size="sm"
                  @update="emit('setQty', item.cartKey, $event, productStock(item.id))"
                />
              </div>
            </div>
            <button class="text-[#ccc] hover:text-red-400 text-xl shrink-0" @click="emit('remove', item.cartKey)">×</button>
          </div>
        </div>

        <div v-if="cart.length > 0" class="border-t border-[#eee] px-4 lg:px-6 py-4 lg:py-5 flex flex-col gap-3 lg:gap-4">
          <div class="flex justify-between text-lg lg:text-xl font-bold">
            <span>Итого:</span>
            <span class="text-brand">{{ formatPrice(totalPrice) }}</span>
          </div>
          <!-- Delivery type -->
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-2">Способ получения</label>
            <div class="flex flex-col gap-2">
              <!-- Pickup option -->
              <label
                class="flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors"
                :class="deliveryType === 'pickup' ? 'border-brand bg-brand/5' : 'border-[#e0e0e0]'"
              >
                <input type="radio" v-model="deliveryType" value="pickup" class="mt-0.5 accent-brand shrink-0" />
                <div>
                  <div class="text-sm font-semibold text-[#222]">Самовывоз</div>
                  <div v-if="pickupAddress" class="text-xs text-[#666] mt-0.5 leading-snug">{{ pickupAddress }}</div>
                </div>
              </label>
              <!-- Delivery stub -->
              <label class="flex items-start gap-3 rounded-xl border-2 border-[#e0e0e0] px-4 py-3 opacity-60 cursor-not-allowed select-none">
                <input type="radio" disabled class="mt-0.5 shrink-0" />
                <div>
                  <div class="text-sm font-semibold text-[#222]">Доставка</div>
                  <div class="text-xs text-[#888] mt-0.5">Работаем над добавлением доставки</div>
                </div>
              </label>
            </div>
          </div>
          <!-- Payment method -->
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-2">Способ оплаты</label>
            <div class="flex flex-col gap-2">
              <label
                class="flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors"
                :class="paymentMethod === 'online_card' ? 'border-brand bg-brand/5' : 'border-[#e0e0e0]'"
              >
                <input type="radio" v-model="paymentMethod" value="online_card" class="mt-0.5 accent-brand shrink-0" />
                <div>
                  <div class="text-sm font-semibold text-[#222]">Картой онлайн</div>
                  <div class="text-xs text-[#666] mt-0.5">Безопасная оплата через ЮKassa</div>
                </div>
              </label>
              <label
                class="flex items-start gap-3 rounded-xl border-2 px-4 py-3 cursor-pointer transition-colors"
                :class="paymentMethod === 'cash' ? 'border-brand bg-brand/5' : 'border-[#e0e0e0]'"
              >
                <input type="radio" v-model="paymentMethod" value="cash" class="mt-0.5 accent-brand shrink-0" />
                <div>
                  <div class="text-sm font-semibold text-[#222]">Наличными при получении</div>
                </div>
              </label>
            </div>
          </div>
          <!-- Email for receipt (required for online payment) -->
          <div v-if="paymentMethod === 'online_card'">
            <label class="block text-xs font-semibold text-[#777] mb-1.5">
              Email для чека <span class="text-red-400">*</span>
            </label>
            <input
              v-model="emailInput"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              :class="emailError ? 'border-red-400 focus:border-red-400' : 'border-[#ddd] focus:border-brand'"
              @blur="emailTouched = true"
            />
            <p v-if="emailError" class="text-xs text-red-500 mt-1">Укажите корректный email</p>
            <p class="text-xs text-[#aaa] mt-1">Чек об оплате придёт на этот адрес</p>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий к заказу</label>
            <textarea
              :value="comment"
              rows="3"
              maxlength="1000"
              placeholder="Например: удобное время для звонка или пожелания по заказу"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none"
              @input="emit('update:comment', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
          <div v-if="authRequired && !authenticated" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
            Для оформления заказа нужно войти в аккаунт.
          </div>
          <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
            {{ error }}
          </div>
          <button
            class="btn-primary py-3 lg:py-3.5 text-base lg:text-lg disabled:opacity-50"
            :disabled="loading || (paymentMethod === 'online_card' && !emailValid)"
            @click="emailTouched = true; if (paymentMethod === 'cash' || emailValid) emit('checkout', paymentMethod, emailInput.trim())"
          >
            {{ loading ? 'Оформляем...' : paymentMethod === 'online_card' ? 'Оплатить онлайн' : 'Оформить заказ' }}
          </button>
          <NuxtLink
            v-if="!authenticated"
            to="/login?next=/shop"
            class="text-sm text-brand font-semibold text-center no-underline hover:underline"
          >
            Войти или зарегистрироваться
          </NuxtLink>
          <button class="text-sm text-[#aaa] hover:text-red-400 transition-colors text-center" @click="emit('clear')">
            Очистить корзину
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
