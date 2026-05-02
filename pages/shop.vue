<script setup lang="ts">
useHead({ title: 'Острый край — Магазин' })

const [{ data: allProducts }, { data: categoriesRaw }] = await Promise.all([
  useFetch('/api/products'),
  useFetch('/api/product-categories'),
])

const categories = computed(() => ['Все', ...(categoriesRaw.value?.map(c => c.name) ?? [])])

const search = ref('')
const activeCategory = ref('Все')
const sortBy = ref<'default' | 'price_asc' | 'price_desc' | 'name'>('default')

const filtered = computed(() => {
  let list = allProducts.value ?? []
  if (activeCategory.value !== 'Все') list = list.filter(p => p.category === activeCategory.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
  }
  if (sortBy.value === 'price_asc') list = [...list].sort((a, b) => a.price - b.price)
  else if (sortBy.value === 'price_desc') list = [...list].sort((a, b) => b.price - a.price)
  else if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return list
})

// Модалка товара
const modal = ref<typeof allProducts.value[0] | null>(null)
const modalPhotoIdx = ref(0)
function openModal(product: typeof allProducts.value[0]) {
  modal.value = product
  modalPhotoIdx.value = 0
}
function closeModal() { modal.value = null }

// Корзина
const { cart, totalQty, totalPrice, addToCart, removeFromCart, setQty, clearCart } = useCart()
const { user, fetchUser } = useAuth()
const cartOpen = ref(false)
const orderSuccess = ref(false)
const orderAuthRequired = ref(false)
const orderError = ref('')
const checkoutLoading = ref(false)
const createdOrderId = ref<number | null>(null)
const orderComment = ref('')

await fetchUser()

function addAndNotify(product: typeof allProducts.value[0]) {
  addToCart(product)
}

function cartQty(productId: number): number {
  return cart.value.find(i => i.id === productId)?.qty ?? 0
}

async function checkout() {
  orderError.value = ''

  if (!user.value) {
    orderAuthRequired.value = true
    return
  }

  if (cart.value.length === 0) return

  checkoutLoading.value = true
  try {
    const order = await $fetch<{ id: number }>('/api/orders', {
      method: 'POST',
      body: {
        items: cart.value.map(item => ({ id: item.id, qty: item.qty })),
        comment: orderComment.value,
      },
    })
    createdOrderId.value = order.id
    clearCart()
    orderComment.value = ''
    cartOpen.value = false
    orderSuccess.value = true
  } catch (err: any) {
    orderError.value = err?.data?.message ?? 'Не удалось оформить заказ'
  } finally {
    checkoutLoading.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); cartOpen.value = false }
  })
})

function formatPrice(p: number) {
  return p.toLocaleString('ru-RU') + ' ₽'
}
</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)]">
    <!-- Top bar -->
    <div class="bg-white border-b border-[#e8e8e8] sticky top-[88px] z-30">
      <div class="max-w-[1440px] mx-auto px-10 py-4 flex gap-4 items-center flex-wrap">
        <!-- Search -->
        <input
          v-model="search"
          type="text"
          placeholder="Поиск товаров..."
          class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand transition-colors min-w-[220px] flex-1 max-w-[320px]"
        />
        <!-- Categories -->
        <div class="flex gap-2 flex-wrap flex-1">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
            :class="activeCategory === cat
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-[#444] border-[#e0e0e0] hover:border-brand hover:text-brand'"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>
        <!-- Sort -->
        <select
          v-model="sortBy"
          class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand bg-white"
        >
          <option value="default">По умолчанию</option>
          <option value="price_asc">Цена: по возрастанию</option>
          <option value="price_desc">Цена: по убыванию</option>
          <option value="name">По названию</option>
        </select>
        <!-- Cart button -->
        <button
          class="relative flex items-center gap-2 bg-brand text-white rounded-xl px-5 py-2.5 font-bold text-base shadow-[0_3px_0_rgba(9,136,189,0.7)] hover:brightness-110 transition-all"
          @click="cartOpen = true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Корзина
          <span v-if="totalQty > 0" class="absolute -top-2 -right-2 bg-white text-brand text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">{{ totalQty }}</span>
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div class="max-w-[1440px] mx-auto px-10 py-10">
      <p v-if="filtered.length === 0" class="text-center text-xl text-[#888] py-20">Ничего не найдено</p>
      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))">
        <div
          v-for="product in filtered"
          :key="product.id"
          class="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.13)] hover:-translate-y-1 transition-all duration-200"
          @click="openModal(product)"
        >
          <div
            class="h-[200px] bg-center bg-cover bg-[rgb(235,235,235)]"
            :style="product.photos[0] ? `background-image: url('${product.photos[0]}')` : ''"
          />
          <div class="p-5 flex flex-col flex-1 gap-2">
            <div class="text-[17px] font-semibold text-[#222] leading-snug flex-1">{{ product.name }}</div>
            <div class="text-sm text-[#888]">{{ product.category }}</div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-[22px] font-bold text-brand">{{ formatPrice(product.price) }}</span>
              <span
                class="text-xs font-semibold px-2.5 py-1 rounded-lg"
                :class="product.stock === 0 ? 'bg-red-100 text-red-500' : product.stock < 5 ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'"
              >
                {{ product.stock === 0 ? 'Нет в наличии' : product.stock < 5 ? `Осталось ${product.stock}` : 'В наличии' }}
              </span>
            </div>
            <div v-if="cartQty(product.id) > 0" class="mt-2 flex items-center justify-between" @click.stop>
              <button class="w-9 h-9 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center" @click="setQty(product.id, cartQty(product.id) - 1)">−</button>
              <span class="font-bold text-[#222] text-base">{{ cartQty(product.id) }}</span>
              <button class="w-9 h-9 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center" @click="setQty(product.id, cartQty(product.id) + 1)">+</button>
            </div>
            <button
              v-else
              class="mt-2 btn-primary py-2.5 text-base w-full"
              :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
              :disabled="product.stock === 0"
              @click.stop="addAndNotify(product)"
            >В корзину</button>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Product modal -->
  <Teleport to="body">
    <div
      v-if="modal"
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      @click.self="closeModal"
    >
      <div class="bg-white rounded-2xl max-w-[860px] w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="flex gap-8 p-8">
          <!-- Photos -->
          <div class="flex flex-col gap-3 w-[340px] shrink-0">
            <div
              class="h-[280px] rounded-xl bg-center bg-cover bg-[#f0f0f0]"
              :style="modal.photos[modalPhotoIdx] ? `background-image: url('${modal.photos[modalPhotoIdx]}')` : ''"
            />
            <div v-if="modal.photos.length > 1" class="flex gap-2 flex-wrap">
              <div
                v-for="(ph, i) in modal.photos"
                :key="i"
                class="w-16 h-16 rounded-lg bg-center bg-cover cursor-pointer border-2 transition-colors"
                :class="i === modalPhotoIdx ? 'border-brand' : 'border-transparent hover:border-brand/50'"
                :style="ph ? `background-image: url('${ph}')` : ''"
                @click="modalPhotoIdx = i"
              />
            </div>
          </div>
          <!-- Info -->
          <div class="flex-1 flex flex-col gap-4">
            <button class="self-end text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="closeModal">×</button>
            <div class="text-sm text-[#888]">{{ modal.category }}</div>
            <div class="text-[26px] font-bold text-[#111] leading-snug">{{ modal.name }}</div>
            <div class="text-[30px] font-bold text-brand">{{ formatPrice(modal.price) }}</div>
            <span
              class="text-sm font-semibold px-3 py-1 rounded-lg w-fit"
              :class="modal.stock === 0 ? 'bg-red-100 text-red-500' : modal.stock < 5 ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'"
            >
              {{ modal.stock === 0 ? 'Нет в наличии' : modal.stock < 5 ? `Осталось ${modal.stock} шт.` : `В наличии: ${modal.stock} шт.` }}
            </span>
            <p class="text-base text-[#555] leading-relaxed">{{ modal.description }}</p>
            <!-- Specs -->
            <div v-if="modal.specs.length > 0" class="border border-[#eee] rounded-xl overflow-hidden">
              <div
                v-for="spec in modal.specs"
                :key="spec.key"
                class="flex gap-4 px-4 py-2.5 text-sm border-b border-[#f0f0f0] last:border-0"
              >
                <span class="text-[#888] min-w-[140px]">{{ spec.key }}</span>
                <span class="font-semibold text-[#222]">{{ spec.value }}</span>
              </div>
            </div>
            <div v-if="cartQty(modal.id) > 0" class="mt-auto flex items-center gap-3">
              <button class="w-11 h-11 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center" @click="setQty(modal.id, cartQty(modal.id) - 1)">−</button>
              <span class="font-bold text-[#222] text-xl min-w-[32px] text-center">{{ cartQty(modal.id) }}</span>
              <button class="w-11 h-11 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center" @click="setQty(modal.id, cartQty(modal.id) + 1)">+</button>
              <span class="text-[#888] text-sm">в корзине</span>
            </div>
            <button
              v-else
              class="btn-primary py-3 text-lg mt-auto"
              :disabled="modal.stock === 0"
              :class="{ 'opacity-50 cursor-not-allowed': modal.stock === 0 }"
              @click="addAndNotify(modal)"
            >Добавить в корзину</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Cart sidebar -->
  <Teleport to="body">
    <div v-if="cartOpen" class="fixed inset-0 z-[200]" @click.self="cartOpen = false">
      <div class="absolute inset-0 bg-black/50" @click="cartOpen = false" />
      <div class="absolute right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl flex flex-col">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="text-xl font-bold">Корзина</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="cartOpen = false">×</button>
        </div>

        <div v-if="cart.length === 0" class="flex-1 flex flex-col items-center justify-center text-[#aaa] gap-3">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="text-lg">Корзина пуста</span>
        </div>

        <div v-else class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          <div v-for="item in cart" :key="item.id" class="flex gap-3 items-start">
            <div
              class="w-16 h-16 rounded-xl bg-center bg-cover bg-[#f0f0f0] shrink-0"
              :style="item.photo ? `background-image: url('${item.photo}')` : ''"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-[#222] leading-snug mb-1 line-clamp-2">{{ item.name }}</div>
              <div class="text-brand font-bold">{{ formatPrice(item.price) }}</div>
              <div class="flex items-center gap-2 mt-2">
                <button class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold hover:bg-brand hover:text-white transition-colors" @click="setQty(item.id, item.qty - 1)">−</button>
                <span class="font-semibold min-w-[24px] text-center">{{ item.qty }}</span>
                <button class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold hover:bg-brand hover:text-white transition-colors" @click="setQty(item.id, item.qty + 1)">+</button>
              </div>
            </div>
            <button class="text-[#ccc] hover:text-red-400 text-xl shrink-0" @click="removeFromCart(item.id)">×</button>
          </div>
        </div>

        <div v-if="cart.length > 0" class="border-t border-[#eee] px-6 py-5 flex flex-col gap-4">
          <div class="flex justify-between text-xl font-bold">
            <span>Итого:</span>
            <span class="text-brand">{{ formatPrice(totalPrice) }}</span>
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Комментарий к заказу</label>
            <textarea
              v-model="orderComment"
              rows="3"
              maxlength="1000"
              placeholder="Например: удобное время для звонка или пожелания по заказу"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none"
            />
          </div>
          <div v-if="orderAuthRequired && !user" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
            Для оформления заказа нужно войти в аккаунт.
          </div>
          <div v-if="orderError" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 leading-relaxed">
            {{ orderError }}
          </div>
          <button class="btn-primary py-3.5 text-lg disabled:opacity-50" :disabled="checkoutLoading" @click="checkout">
            {{ checkoutLoading ? 'Оформляем...' : 'Оформить заказ' }}
          </button>
          <NuxtLink
            v-if="!user"
            to="/login?next=/shop"
            class="text-sm text-brand font-semibold text-center no-underline hover:underline"
          >
            Войти или зарегистрироваться
          </NuxtLink>
          <button class="text-sm text-[#aaa] hover:text-red-400 transition-colors text-center" @click="clearCart">Очистить корзину</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Order success -->
  <Teleport to="body">
    <div
      v-if="orderSuccess"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[300]"
      @click.self="orderSuccess = false"
    >
      <div class="bg-white rounded-2xl p-10 max-w-[440px] w-full text-center shadow-2xl">
        <div class="text-[64px] mb-4">✅</div>
        <div class="text-[26px] font-bold mb-3">Заказ оформлен!</div>
        <p class="text-[#555] text-lg leading-relaxed mb-6">
          Заказ №{{ createdOrderId }} сохранен. Мы свяжемся с вами в ближайшее время для подтверждения.
        </p>
        <button class="btn-primary px-10 py-3 text-lg" @click="orderSuccess = false">Закрыть</button>
      </div>
    </div>
  </Teleport>
</template>
