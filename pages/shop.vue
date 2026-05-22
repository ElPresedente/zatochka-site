<script setup lang="ts">
import type { ProductDto, ProductCategoryDto } from '~/types/api'
import type { CartItemService } from '~/composables/useCart'

useHead({ title: 'Острый край — Магазин' })

const [{ data: allProducts }, { data: categoriesRaw }, { data: siteSettings }] = await Promise.all([
  useFetch<ProductDto[]>('/api/products'),
  useFetch<ProductCategoryDto[]>('/api/product-categories'),
  useFetch<Record<string, string>>('/api/settings'),
])

const search = ref('')
const activeCategory = ref('Все')
const sortBy = ref<'default' | 'price_asc' | 'price_desc' | 'name'>('default')

const mobileFilterOpen = ref(false)
const mobileSortOpen = ref(false)
const mobileFilterRef = ref<HTMLElement | null>(null)
const mobileSortRef = ref<HTMLElement | null>(null)

const sortLabels: Record<string, string> = {
  default: 'Сортировка',
  price_asc: 'Цена ↑',
  price_desc: 'Цена ↓',
  name: 'По А–Я',
}

const categories = computed(() => {
  const visibleProductCategories = new Set((allProducts.value ?? []).map(p => p.category))
  const visibleCategories = categoriesRaw.value
    ?.map(c => c.name)
    .filter(name => visibleProductCategories.has(name)) ?? []

  return ['Все', ...visibleCategories]
})

watch(categories, (currentCategories) => {
  if (!currentCategories.includes(activeCategory.value)) activeCategory.value = 'Все'
})

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

const modalProduct = ref<ProductDto | null>(null)
function openModal(product: ProductDto) { modalProduct.value = product }
function closeModal() { modalProduct.value = null }

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

const productStockById = computed(() => new Map((allProducts.value ?? []).map(p => [p.id, p.stock])))

function productStock(id: number): number {
  return productStockById.value.get(id) ?? 0
}

// total qty across all service combos for card display
function cartQty(id: number): number {
  return cart.value.filter(i => i.id === id).reduce((s, i) => s + i.qty, 0)
}

function cartQtyByKey(cartKey: string): number {
  return cart.value.find(i => i.cartKey === cartKey)?.qty ?? 0
}

function canIncrease(id: number): boolean {
  return cartQty(id) < productStock(id)
}

function canIncreaseByKey(cartKey: string): boolean {
  const item = cart.value.find(i => i.cartKey === cartKey)
  if (!item) return true
  return item.qty < productStock(item.id)
}

watch([cart, allProducts], () => {
  let changed = false

  const nextCart = cart.value.flatMap((item) => {
    const product = (allProducts.value ?? []).find(p => p.id === item.id)
    if (!product || product.stock <= 0) {
      changed = true
      return []
    }

    const nextQty = Math.min(item.qty, product.stock)
    if (nextQty !== item.qty || item.stock !== product.stock) changed = true

    return [{ ...item, qty: nextQty, stock: product.stock }]
  })

  if (changed) {
    cart.value = nextCart
    if (import.meta.client) {
      localStorage.setItem('ostriy_kray_cart', JSON.stringify(cart.value))
    }
  }
}, { deep: true })

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
        items: cart.value.map(item => ({
          id: item.id,
          qty: item.qty,
          serviceIds: item.services.map(s => s.id),
        })),
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

// Toolbar hide-on-scroll-down / show-on-scroll-up
const toolbarHidden = ref(false)
const HIDE_THRESHOLD = 200
const DELTA_THRESHOLD = 6
let lastScrollY = 0
let scrollTicking = false

function onWindowScroll() {
  if (scrollTicking) return
  scrollTicking = true
  requestAnimationFrame(() => {
    const y = window.scrollY
    const delta = y - lastScrollY

    if (y < HIDE_THRESHOLD) {
      toolbarHidden.value = false
    } else if (delta > DELTA_THRESHOLD) {
      toolbarHidden.value = true
    } else if (delta < -DELTA_THRESHOLD) {
      toolbarHidden.value = false
    }

    lastScrollY = y
    scrollTicking = false
  })
}

function onWindowKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { closeModal(); cartOpen.value = false }
}

function onDocClick(e: MouseEvent) {
  if (!mobileFilterRef.value?.contains(e.target as Node)) mobileFilterOpen.value = false
  if (!mobileSortRef.value?.contains(e.target as Node)) mobileSortOpen.value = false
}

onMounted(() => {
  lastScrollY = window.scrollY
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('keydown', onWindowKeydown)
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
  window.removeEventListener('keydown', onWindowKeydown)
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)]">
    <div
      class="bg-white border-b border-[#e8e8e8] sticky top-[68px] lg:top-[130px] z-30 transition-transform duration-300 ease-out will-change-transform"
      :class="toolbarHidden ? '-translate-y-full' : 'translate-y-0'"
    >
      <div class="max-w-[1440px] mx-auto px-4 lg:px-10 py-3 lg:py-4 flex flex-col lg:flex-row gap-3 lg:gap-4 lg:items-center lg:flex-wrap">
        <!-- Row 1 mobile: search + cart -->
        <div class="flex gap-3 items-center lg:contents">
          <input
            v-model="search"
            type="text"
            placeholder="Поиск товаров..."
            class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand transition-colors flex-1 lg:flex-none lg:min-w-[220px] lg:max-w-[320px]"
          />
          <button
            class="relative flex items-center gap-2 bg-brand text-white rounded-xl px-4 lg:px-5 py-2.5 font-bold text-sm lg:text-base shadow-[0_3px_0_rgba(9,136,189,0.7)] hover:brightness-110 transition-all shrink-0 lg:order-last"
            @click="cartOpen = true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="hidden sm:inline">Корзина</span>
            <span v-if="totalQty > 0" class="absolute -top-2 -right-2 bg-white text-brand text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">{{ totalQty }}</span>
          </button>
        </div>
        <!-- Row 2 mobile: category + sort dropdowns -->
        <div class="lg:hidden flex gap-2">
          <!-- Category dropdown -->
          <div ref="mobileFilterRef" class="relative flex-1">
            <button
              class="w-full flex items-center justify-between gap-2 border-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              :class="activeCategory !== 'Все' ? 'bg-brand text-white border-brand' : 'bg-white text-[#444] border-[#e0e0e0]'"
              @click.stop="mobileFilterOpen = !mobileFilterOpen; mobileSortOpen = false"
            >
              <span class="truncate">{{ activeCategory }}</span>
              <svg class="shrink-0 transition-transform" :class="mobileFilterOpen ? 'rotate-180' : ''" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div v-if="mobileFilterOpen" class="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                v-for="cat in categories"
                :key="cat"
                class="w-full px-4 py-3 text-left text-sm font-semibold border-b last:border-0 border-[#f0f0f0] transition-colors"
                :class="activeCategory === cat ? 'text-brand bg-brand/5' : 'text-[#333] hover:bg-[#f5f5f5]'"
                @click.stop="activeCategory = cat; mobileFilterOpen = false"
              >{{ cat }}</button>
            </div>
          </div>
          <!-- Sort dropdown -->
          <div ref="mobileSortRef" class="relative flex-1">
            <button
              class="w-full flex items-center justify-between gap-2 border-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
              :class="sortBy !== 'default' ? 'bg-brand text-white border-brand' : 'bg-white text-[#444] border-[#e0e0e0]'"
              @click.stop="mobileSortOpen = !mobileSortOpen; mobileFilterOpen = false"
            >
              <span class="truncate">{{ sortLabels[sortBy] }}</span>
              <svg class="shrink-0 transition-transform" :class="mobileSortOpen ? 'rotate-180' : ''" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div v-if="mobileSortOpen" class="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e0e0e0] rounded-xl shadow-lg overflow-hidden z-50">
              <button
                v-for="[val, label] in ([['default','По умолчанию'],['price_asc','Цена: по возрастанию'],['price_desc','Цена: по убыванию'],['name','По названию']] as [string,string][])"
                :key="val"
                class="w-full px-4 py-3 text-left text-sm font-semibold border-b last:border-0 border-[#f0f0f0] transition-colors"
                :class="sortBy === val ? 'text-brand bg-brand/5' : 'text-[#333] hover:bg-[#f5f5f5]'"
                @click.stop="sortBy = val as typeof sortBy; mobileSortOpen = false"
              >{{ label }}</button>
            </div>
          </div>
        </div>

        <!-- Desktop: categories chips -->
        <div class="hidden lg:flex gap-2 flex-wrap flex-1 scrollbar-thin">
          <button
            v-for="cat in categories"
            :key="cat"
            class="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-colors whitespace-nowrap shrink-0"
            :class="activeCategory === cat
              ? 'bg-brand text-white border-brand'
              : 'bg-white text-[#444] border-[#e0e0e0] hover:border-brand hover:text-brand'"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>
        <!-- Desktop: sort select -->
        <select
          v-model="sortBy"
          class="hidden lg:block border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand bg-white"
        >
          <option value="default">По умолчанию</option>
          <option value="price_asc">Цена: по возрастанию</option>
          <option value="price_desc">Цена: по убыванию</option>
          <option value="name">По названию</option>
        </select>
      </div>
    </div>

    <div class="max-w-[1440px] mx-auto px-2 sm:px-3 lg:px-10 py-4 lg:py-6">
      <p v-if="filtered.length === 0" class="text-center text-base lg:text-xl text-[#888] py-16 lg:py-20">Ничего не найдено</p>
      <div class="grid gap-3 sm:gap-4 lg:gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <ShopProductCard
          v-for="product in filtered"
          :key="product.id"
          :product="product"
          :cart-qty="cartQty(product.id)"
          :can-increase="canIncrease(product.id)"
          @open="openModal"
          @add="(p: ProductDto) => addToCart(p)"
          @set-qty="(cartKey: string, qty: number, stock: number) => setQty(cartKey, qty, stock)"
        />
      </div>
    </div>
  </main>

  <ShopProductModal
    v-if="modalProduct"
    :product="modalProduct"
    :cart-qty-by-key="cartQtyByKey"
    :can-increase-by-key="canIncreaseByKey"
    @close="closeModal"
    @add="(p: ProductDto, svcs: CartItemService[]) => addToCart(p, svcs)"
    @set-qty="(cartKey: string, qty: number, stock: number) => setQty(cartKey, qty, stock)"
  />

  <ShopCartDrawer
    v-if="cartOpen"
    :cart="cart"
    :total-price="totalPrice"
    :comment="orderComment"
    :auth-required="orderAuthRequired"
    :authenticated="!!user"
    :loading="checkoutLoading"
    :error="orderError"
    :product-stock="productStock"
    :pickup-address="siteSettings?.address || ''"
    @close="cartOpen = false"
    @set-qty="setQty"
    @remove="removeFromCart"
    @clear="clearCart"
    @checkout="checkout"
    @update:comment="orderComment = $event"
  />

  <ShopOrderSuccessModal
    v-if="orderSuccess"
    :order-id="createdOrderId"
    @close="orderSuccess = false"
  />
</template>
