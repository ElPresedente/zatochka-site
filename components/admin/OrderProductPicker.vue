<script setup lang="ts">
import type { ProductDto, ProductService } from '~/types/api'

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active' | 'services'>

const props = defineProps<{
  products: AdminProduct[]
}>()

const emit = defineEmits<{
  add: [items: { productId: number, quantity: number, serviceIds: string[] }[]]
  close: []
}>()

const { formatPrice } = useFormatters()

const search = ref('')
const selectedCategory = ref('')

// Per-product card: which services are currently checked
const cardServices = reactive<Record<number, string[]>>({})

// Per-combo (productId:serviceIds): quantity
const quantities = reactive<Record<string, number>>({})

const categories = computed(() =>
  [...new Set(props.products.map(p => p.category).filter(Boolean))].sort(),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return props.products.filter((p) => {
    if (selectedCategory.value && p.category !== selectedCategory.value) return false
    if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
    return true
  })
})

function comboKey(productId: number, serviceIds: string[]): string {
  const sorted = [...serviceIds].sort()
  return sorted.length ? `${productId}:${sorted.join(',')}` : String(productId)
}

function currentKey(productId: number): string {
  return comboKey(productId, cardServices[productId] ?? [])
}

function currentQty(productId: number): number {
  return quantities[currentKey(productId)] ?? 0
}

function productTotalQty(productId: number): number {
  return Object.entries(quantities)
    .filter(([key]) => key === String(productId) || key.startsWith(`${productId}:`))
    .reduce((sum, [, qty]) => sum + (qty as number), 0)
}

function toggleService(productId: number, serviceId: string) {
  const current = cardServices[productId] ?? []
  cardServices[productId] = current.includes(serviceId)
    ? current.filter(id => id !== serviceId)
    : [...current, serviceId]
}

function setQty(productId: number, qty: number) {
  const key = currentKey(productId)
  const clamped = Math.max(0, Math.min(999, Math.floor(qty)))
  if (clamped === 0) delete quantities[key]
  else quantities[key] = clamped
}

const selectedItems = computed(() =>
  Object.entries(quantities)
    .filter(([, qty]) => (qty as number) > 0)
    .map(([key, qty]) => {
      const colonIdx = key.indexOf(':')
      const productId = colonIdx >= 0 ? Number(key.slice(0, colonIdx)) : Number(key)
      const serviceIds = colonIdx >= 0 ? key.slice(colonIdx + 1).split(',').filter(Boolean) : []
      return { productId, quantity: qty as number, serviceIds }
    }),
)

const totalQty = computed(() => selectedItems.value.reduce((s, i) => s + i.quantity, 0))

function confirm() {
  if (selectedItems.value.length === 0) return
  emit('add', selectedItems.value)
}

function stockBadgeClass(stock: number) {
  if (stock === 0) return 'bg-red-100 text-red-500'
  if (stock < 5) return 'bg-orange-100 text-orange-500'
  return 'bg-green-100 text-green-600'
}

function stockBadgeText(stock: number) {
  if (stock === 0) return 'Нет в нал.'
  return `ост. ${stock}`
}

function comboLabel(product: AdminProduct, serviceIds: string[]): string {
  if (!serviceIds.length) return 'без услуг'
  return serviceIds
    .map(id => (product.services as ProductService[]).find(s => s.id === id)?.name ?? id)
    .join(', ')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-0 sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-[1000px] sm:max-h-[88vh] flex flex-col shadow-2xl">

        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 lg:px-6 py-3 lg:py-4 border-b border-[#eee] shrink-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm lg:text-base font-bold text-[#222]">Выберите товары</span>
            <button class="sm:hidden text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
          </div>
          <div class="sm:ml-auto flex items-center gap-3">
            <input
              v-model="search"
              type="text"
              placeholder="Поиск..."
              class="border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand flex-1 sm:w-52"
            />
            <button class="hidden sm:block text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
          </div>
        </div>

        <!-- Category chips -->
        <div class="px-4 lg:px-6 py-2 lg:py-3 border-b border-[#eee] flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            class="shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            :class="!selectedCategory ? 'bg-brand text-white' : 'bg-[#f0f0f0] text-[#555] hover:bg-[#e5e5e5]'"
            @click="selectedCategory = ''"
          >Все</button>
          <button
            v-for="cat in categories"
            :key="cat"
            class="shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            :class="selectedCategory === cat ? 'bg-brand text-white' : 'bg-[#f0f0f0] text-[#555] hover:bg-[#e5e5e5]'"
            @click="selectedCategory = cat"
          >{{ cat }}</button>
        </div>

        <!-- Products grid -->
        <div class="flex-1 overflow-y-auto px-3 lg:px-6 py-3 lg:py-4">
          <div v-if="filtered.length === 0" class="py-20 text-center text-[#aaa] text-sm">
            Ничего не найдено
          </div>
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
            <div
              v-for="product in filtered"
              :key="product.id"
              class="rounded-2xl border-2 overflow-hidden flex flex-col transition-all"
              :class="productTotalQty(product.id) > 0
                ? 'border-brand shadow-[0_0_0_3px_rgba(var(--color-brand-rgb),0.12)]'
                : 'border-[#eee]'"
            >
              <!-- Photo -->
              <div
                class="h-[100px] bg-center bg-cover bg-[#f2f2f2] relative shrink-0"
                :style="product.photos[0] ? `background-image: url('${product.photos[0]}')` : ''"
              >
                <span
                  v-if="!product.active"
                  class="absolute top-2 left-2 text-[10px] font-semibold bg-[#555]/80 text-white px-1.5 py-0.5 rounded-md"
                >скрыт</span>
              </div>

              <!-- Info -->
              <div class="p-3 flex flex-col gap-1 flex-1">
                <div class="text-sm font-semibold text-[#222] leading-snug line-clamp-2">{{ product.name }}</div>
                <div class="text-xs text-[#999]">{{ product.category }}</div>

                <div class="flex items-center justify-between mt-1">
                  <span class="text-sm font-bold text-brand">{{ formatPrice(product.price) }}</span>
                  <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" :class="stockBadgeClass(product.stock)">
                    {{ stockBadgeText(product.stock) }}
                  </span>
                </div>

                <!-- Service chips -->
                <div v-if="(product.services as ProductService[]).length > 0" class="flex flex-wrap gap-1 mt-1">
                  <button
                    v-for="svc in (product.services as ProductService[])"
                    :key="svc.id"
                    class="text-[11px] px-1.5 py-0.5 rounded-md border font-medium transition-colors leading-tight"
                    :class="(cardServices[product.id] ?? []).includes(svc.id)
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-[#f5f5f5] text-[#666] border-[#ddd] hover:border-amber-200 hover:bg-amber-50'"
                    @click="toggleService(product.id, svc.id)"
                  >
                    {{ svc.name }} +{{ formatPrice(svc.price) }}
                  </button>
                </div>

                <!-- Counter or add button for current combo -->
                <div v-if="currentQty(product.id) > 0" class="flex items-center gap-1.5 mt-2">
                  <button
                    class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold text-lg leading-none hover:bg-brand hover:text-white transition-colors flex items-center justify-center"
                    @click="setQty(product.id, currentQty(product.id) - 1)"
                  >−</button>
                  <input
                    :value="currentQty(product.id)"
                    type="number"
                    min="1"
                    max="999"
                    class="flex-1 min-w-0 h-7 text-center text-sm font-semibold border border-[#ddd] rounded-lg outline-none focus:border-brand"
                    @input="setQty(product.id, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button
                    class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold text-lg leading-none hover:bg-brand hover:text-white transition-colors flex items-center justify-center"
                    @click="setQty(product.id, currentQty(product.id) + 1)"
                  >+</button>
                </div>
                <button
                  v-else
                  class="mt-2 w-full py-1.5 rounded-xl text-sm font-semibold transition-colors bg-[#f4f4f4] text-[#555] hover:bg-brand hover:text-white"
                  @click="setQty(product.id, 1)"
                >+ В заказ</button>

                <!-- Summary of all selected combos for this product -->
                <div
                  v-if="productTotalQty(product.id) > 0"
                  class="mt-1.5 pt-1.5 border-t border-[#f0f0f0] flex flex-col gap-0.5"
                >
                  <template v-for="item in selectedItems.filter(i => i.productId === product.id)" :key="item.serviceIds.join(',')">
                    <div class="text-[11px] text-[#777] flex justify-between">
                      <span>{{ comboLabel(product, item.serviceIds) }}</span>
                      <span class="font-semibold text-[#444]">{{ item.quantity }} шт.</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 lg:px-6 py-3 lg:py-4 border-t border-[#eee] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <div class="text-xs lg:text-sm text-[#777]">
            <template v-if="totalQty > 0">
              Позиций: <span class="font-bold text-[#222]">{{ selectedItems.length }}</span>,
              штук: <span class="font-bold text-[#222]">{{ totalQty }}</span>
            </template>
            <template v-else>Выберите товары</template>
          </div>
          <div class="flex gap-2 lg:gap-3">
            <button
              class="flex-1 sm:flex-initial px-4 lg:px-5 py-2.5 rounded-xl border border-[#ddd] text-sm text-[#555] hover:bg-[#f5f5f5] transition-colors"
              @click="emit('close')"
            >Отмена</button>
            <button
              class="flex-1 sm:flex-initial px-4 lg:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="totalQty > 0 ? 'bg-brand text-white hover:brightness-110' : 'bg-[#eee] text-[#aaa] cursor-not-allowed'"
              :disabled="totalQty === 0"
              @click="confirm"
            >Добавить</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
