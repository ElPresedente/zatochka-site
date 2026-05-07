<script setup lang="ts">
import type { ProductDto } from '~/types/api'

type AdminProduct = Pick<ProductDto, 'id' | 'name' | 'category' | 'price' | 'stock' | 'photos' | 'active'>

const props = defineProps<{
  products: AdminProduct[]
}>()

const emit = defineEmits<{
  add: [items: { productId: number, quantity: number }[]]
  close: []
}>()

const { formatPrice } = useFormatters()

const search = ref('')
const selectedCategory = ref('')
const quantities = reactive<Record<number, number>>({})

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

const selectedItems = computed(() =>
  Object.entries(quantities)
    .filter(([, qty]) => (qty as number) > 0)
    .map(([id, qty]) => ({ productId: Number(id), quantity: qty as number })),
)

const totalQty = computed(() => selectedItems.value.reduce((s, i) => s + i.quantity, 0))

function setQty(productId: number, qty: number) {
  const clamped = Math.max(0, Math.min(999, Math.floor(qty)))
  if (clamped === 0) delete quantities[productId]
  else quantities[productId] = clamped
}

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
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[110] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl w-full max-w-[1000px] max-h-[88vh] flex flex-col shadow-2xl">

        <!-- Header -->
        <div class="flex items-center gap-4 px-6 py-4 border-b border-[#eee] shrink-0">
          <span class="text-base font-bold text-[#222]">Выберите товары для добавления</span>
          <div class="ml-auto flex items-center gap-3">
            <input
              v-model="search"
              type="text"
              placeholder="Поиск..."
              class="border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand w-52"
            />
            <button class="text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
          </div>
        </div>

        <!-- Category chips -->
        <div class="px-6 py-3 border-b border-[#eee] flex items-center gap-2 overflow-x-auto shrink-0">
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
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div v-if="filtered.length === 0" class="py-20 text-center text-[#aaa] text-sm">
            Ничего не найдено
          </div>
          <div v-else class="grid grid-cols-4 gap-3">
            <div
              v-for="product in filtered"
              :key="product.id"
              class="rounded-2xl border-2 overflow-hidden flex flex-col transition-all"
              :class="quantities[product.id] > 0
                ? 'border-brand shadow-[0_0_0_3px_rgba(var(--color-brand-rgb),0.12)]'
                : 'border-[#eee]'"
            >
              <!-- Photo -->
              <div
                class="h-[120px] bg-center bg-cover bg-[#f2f2f2] relative"
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

                <div class="flex items-center justify-between mt-auto pt-2">
                  <span class="text-sm font-bold text-brand">{{ formatPrice(product.price) }}</span>
                  <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" :class="stockBadgeClass(product.stock)">
                    {{ stockBadgeText(product.stock) }}
                  </span>
                </div>

                <!-- Controls: counter or add button -->
                <div v-if="quantities[product.id] > 0" class="flex items-center gap-1.5 mt-2">
                  <button
                    class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold text-lg leading-none hover:bg-brand hover:text-white transition-colors flex items-center justify-center"
                    @click="setQty(product.id, (quantities[product.id] ?? 1) - 1)"
                  >−</button>
                  <input
                    :value="quantities[product.id]"
                    type="number"
                    min="1"
                    max="999"
                    class="flex-1 min-w-0 h-7 text-center text-sm font-semibold border border-[#ddd] rounded-lg outline-none focus:border-brand"
                    @input="setQty(product.id, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button
                    class="w-7 h-7 rounded-lg bg-[#f0f0f0] font-bold text-lg leading-none hover:bg-brand hover:text-white transition-colors flex items-center justify-center"
                    @click="setQty(product.id, (quantities[product.id] ?? 0) + 1)"
                  >+</button>
                </div>
                <button
                  v-else
                  class="mt-2 w-full py-1.5 rounded-xl text-sm font-semibold transition-colors bg-[#f4f4f4] text-[#555] hover:bg-brand hover:text-white"
                  @click="setQty(product.id, 1)"
                >+ В заказ</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[#eee] flex items-center justify-between shrink-0">
          <div class="text-sm text-[#777]">
            <template v-if="totalQty > 0">
              Выбрано позиций: <span class="font-bold text-[#222]">{{ selectedItems.length }}</span>,
              всего штук: <span class="font-bold text-[#222]">{{ totalQty }}</span>
            </template>
            <template v-else>Выберите товары</template>
          </div>
          <div class="flex gap-3">
            <button
              class="px-5 py-2.5 rounded-xl border border-[#ddd] text-sm text-[#555] hover:bg-[#f5f5f5] transition-colors"
              @click="emit('close')"
            >Отмена</button>
            <button
              class="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              :class="totalQty > 0 ? 'bg-brand text-white hover:brightness-110' : 'bg-[#eee] text-[#aaa] cursor-not-allowed'"
              :disabled="totalQty === 0"
              @click="confirm"
            >Добавить в заказ</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
