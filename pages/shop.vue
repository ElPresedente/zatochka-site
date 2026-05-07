<script setup lang="ts">
import type { ProductDto, ProductCategoryDto } from '~/types/api'
import type { CartItemService } from '~/composables/useCart'

useHead({ title: 'Острый край — Магазин' })

const [{ data: allProducts }, { data: categoriesRaw }] = await Promise.all([
  useFetch<ProductDto[]>('/api/products'),
  useFetch<ProductCategoryDto[]>('/api/product-categories'),
])

const search = ref('')
const activeCategory = ref('Все')
const sortBy = ref<'default' | 'price_asc' | 'price_desc' | 'name'>('default')

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

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); cartOpen.value = false }
  })
})
</script>

<template>
  <main class="flex-1 w-full bg-[rgb(245,245,245)]">
    <div class="bg-white border-b border-[#e8e8e8] sticky top-[130px] z-30">
      <div class="max-w-[1440px] mx-auto px-10 py-4 flex gap-4 items-center flex-wrap">
        <input
          v-model="search"
          type="text"
          placeholder="Поиск товаров..."
          class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand transition-colors min-w-[220px] flex-1 max-w-[320px]"
        />
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
        <select
          v-model="sortBy"
          class="border border-[#ddd] rounded-xl px-4 py-2.5 text-base outline-none focus:border-brand bg-white"
        >
          <option value="default">По умолчанию</option>
          <option value="price_asc">Цена: по возрастанию</option>
          <option value="price_desc">Цена: по убыванию</option>
          <option value="name">По названию</option>
        </select>
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

    <div class="max-w-[1440px] mx-auto px-10 py-10">
      <p v-if="filtered.length === 0" class="text-center text-xl text-[#888] py-20">Ничего не найдено</p>
      <div class="grid gap-6" style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))">
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
