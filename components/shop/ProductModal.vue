<script setup lang="ts">
import type { ProductDto } from '~/types/api'
import type { CartItemService } from '~/composables/useCart'

const props = defineProps<{
  product: ProductDto
  cartQty: number
  cartKey: string | undefined
  initialServiceIds?: string[]
}>()

const emit = defineEmits<{
  close: []
  add: [product: ProductDto, services: CartItemService[]]
  setQty: [cartKey: string, qty: number, stock: number]
  servicesChange: [services: CartItemService[]]
}>()

const { formatPrice } = useFormatters()

const photoIdx = ref(0)
const zoomed = ref(false)
const zoomEl = ref<HTMLElement | null>(null)
const selectedServiceIds = ref(new Set<string>(props.initialServiceIds ?? []))

const touchStartX = ref(0)

function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.touches[0].clientX
}

function onTouchEnd(e: TouchEvent) {
  if (!multiplePhotos.value) return
  const dx = e.changedTouches[0].clientX - touchStartX.value
  if (Math.abs(dx) < 40) return
  dx < 0 ? next() : prev()
}

watch(() => props.product, () => {
  photoIdx.value = 0
  zoomed.value = false
  selectedServiceIds.value = new Set(props.initialServiceIds ?? [])
})

watch(zoomed, (val) => {
  if (val) nextTick(() => zoomEl.value?.focus())
})

const multiplePhotos = computed(() => props.product.photos.length > 1)
const currentPhoto = computed(() => props.product.photos[photoIdx.value] || '/images/nofoto.jpg')

const selectedServices = computed<CartItemService[]>(() =>
  props.product.services.filter(s => selectedServiceIds.value.has(s.id)),
)
const servicesTotal = computed(() =>
  selectedServices.value.reduce((s, sv) => s + sv.price, 0),
)
const displayPrice = computed(() => props.product.price + servicesTotal.value)

function toggleService(id: string) {
  const next = new Set(selectedServiceIds.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selectedServiceIds.value = next
  // Не используем computed — читаем из next напрямую, чтобы не зависеть от времени обновления Vue
  emit('servicesChange', props.product.services.filter(s => next.has(s.id)) as CartItemService[])
}

function prev() {
  photoIdx.value = (photoIdx.value - 1 + props.product.photos.length) % props.product.photos.length
}
function next() {
  photoIdx.value = (photoIdx.value + 1) % props.product.photos.length
}

const stockBadgeClass = computed(() => {
  if (props.product.stock === 0) return 'bg-red-100 text-red-500'
  if (props.product.stock < 5) return 'bg-orange-100 text-orange-500'
  return 'bg-green-100 text-green-600'
})

const stockBadgeText = computed(() => {
  if (props.product.stock === 0) return 'Нет в наличии'
  if (props.product.stock < 5) return `Осталось ${props.product.stock} шт.`
  return `В наличии: ${props.product.stock} шт.`
})
</script>

<template>
  <Teleport to="body">
    <!-- Zoom overlay -->
    <Transition name="zoom-fade">
      <div
        v-if="zoomed"
        ref="zoomEl"
        tabindex="-1"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-6 outline-none"
        @click.self="zoomed = false"
        @keydown.esc.stop="zoomed = false"
        @keydown.left.stop="prev"
        @keydown.right.stop="next"
      >
        <button
          class="absolute top-4 right-4 text-white/60 hover:text-white text-4xl leading-none transition-colors"
          @click="zoomed = false"
        >×</button>

        <button
          v-if="multiplePhotos"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/15 hover:bg-white/30 rounded-full transition-colors text-white"
          @click.stop="prev"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <img
          :src="currentPhoto"
          :alt="product.name"
          class="max-w-full max-h-full object-contain rounded-xl select-none"
          @click.stop
          @touchstart.passive="onTouchStart"
          @touchend="onTouchEnd"
        />

        <button
          v-if="multiplePhotos"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center bg-white/15 hover:bg-white/30 rounded-full transition-colors text-white"
          @click.stop="next"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        <div v-if="multiplePhotos" class="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          <button
            v-for="(_, i) in product.photos"
            :key="i"
            class="w-2 h-2 rounded-full transition-colors"
            :class="i === photoIdx ? 'bg-white' : 'bg-white/35 hover:bg-white/60'"
            @click.stop="photoIdx = i"
          />
        </div>
      </div>
    </Transition>

    <!-- Main modal -->
    <div
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-2 sm:p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl max-w-[860px] w-full max-h-[95vh] lg:max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          class="lg:hidden absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 shadow text-[#666] hover:text-[#111] text-2xl leading-none flex items-center justify-center"
          @click="emit('close')"
        >×</button>
        <div class="flex flex-col lg:flex-row gap-4 lg:gap-8 p-4 lg:p-8">

          <!-- Photo column -->
          <div class="flex flex-col gap-3 w-full lg:w-[340px] shrink-0">
            <!-- Main photo with slider -->
            <div class="relative group">
              <div
                class="rounded-xl overflow-hidden transition-opacity"
                :class="currentPhoto ? 'cursor-zoom-in' : ''"
                @click="currentPhoto && (zoomed = true)"
                @touchstart.passive="onTouchStart"
                @touchend="onTouchEnd"
              >
                <img
                  :src="currentPhoto || '/images/nofoto.jpg'"
                  class="w-full h-auto max-h-[240px] lg:max-h-[280px] object-contain block select-none"
                  draggable="false"
                />
              </div>

              <!-- Zoom hint -->
              <div
                v-if="currentPhoto"
                class="absolute bottom-2 right-2 bg-black/40 text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
              </div>

              <!-- Slider prev/next -->
              <button
                v-if="multiplePhotos"
                class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white shadow text-[#333] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="prev"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button
                v-if="multiplePhotos"
                class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/85 hover:bg-white shadow text-[#333] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="next"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>

              <!-- Dot indicators -->
              <div v-if="multiplePhotos" class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                <button
                  v-for="(_, i) in product.photos"
                  :key="i"
                  class="w-1.5 h-1.5 rounded-full transition-colors"
                  :class="i === photoIdx ? 'bg-brand' : 'bg-white/70'"
                  @click.stop="photoIdx = i"
                />
              </div>
            </div>

            <!-- Thumbnails -->
            <div v-if="multiplePhotos" class="flex gap-2 flex-wrap">
              <div
                v-for="(ph, i) in product.photos"
                :key="i"
                class="w-16 h-16 rounded-lg bg-center bg-cover cursor-pointer border-2 transition-colors"
                :class="i === photoIdx ? 'border-brand' : 'border-transparent hover:border-brand/50'"
                :style="ph ? `background-image: url('${ph}')` : ''"
                @click="photoIdx = i"
              />
            </div>
          </div>

          <!-- Info column -->
          <div class="flex-1 flex flex-col gap-3 lg:gap-4">
            <button class="hidden lg:block self-end text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
            <div class="text-xs lg:text-sm text-[#888]">{{ product.category }}</div>
            <div class="text-xl lg:text-[26px] font-bold text-[#111] leading-snug pr-10 lg:pr-0">{{ product.name }}</div>

            <!-- Price: updates dynamically with services -->
            <div class="flex items-baseline gap-2 lg:gap-3 flex-wrap">
              <div class="text-2xl lg:text-[30px] font-bold text-brand">{{ formatPrice(displayPrice) }}</div>
              <div v-if="servicesTotal > 0" class="text-xs lg:text-sm text-[#888]">
                {{ formatPrice(product.price) }} + услуги {{ formatPrice(servicesTotal) }}
              </div>
            </div>

            <span class="text-xs lg:text-sm font-semibold px-2.5 lg:px-3 py-1 rounded-lg w-fit" :class="stockBadgeClass">
              {{ stockBadgeText }}
            </span>
            <p v-if="product.description" class="text-sm lg:text-base text-[#555] leading-relaxed">{{ product.description }}</p>

            <!-- Optional services -->
            <div v-if="product.services.length > 0" class="border border-[#eee] rounded-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-[#fafafa] border-b border-[#eee] text-xs font-semibold text-[#777] uppercase tracking-wide">
                Дополнительные услуги
              </div>
              <label
                v-for="svc in product.services"
                :key="svc.id"
                class="flex items-center justify-between gap-3 px-3 lg:px-4 py-2.5 lg:py-3 border-b border-[#f5f5f5] last:border-0 cursor-pointer hover:bg-[#fafafa] transition-colors"
              >
                <div class="flex items-center gap-2.5 lg:gap-3 min-w-0">
                  <input
                    type="checkbox"
                    :checked="selectedServiceIds.has(svc.id)"
                    class="w-4 h-4 accent-brand cursor-pointer shrink-0"
                    @change="toggleService(svc.id)"
                  />
                  <span class="text-xs lg:text-sm font-medium text-[#222]">{{ svc.name }}</span>
                </div>
                <span class="text-xs lg:text-sm font-bold text-brand whitespace-nowrap shrink-0">+{{ formatPrice(svc.price) }}</span>
              </label>
            </div>

            <div v-if="product.specs.length > 0" class="border border-[#eee] rounded-xl overflow-hidden">
              <div class="grid pl-3 lg:pl-4 text-xs lg:text-sm" style="grid-template-columns: auto 1fr">
                <template v-for="(spec, i) in product.specs" :key="spec.key">
                  <span
                    class="text-[#888] py-2 lg:py-2.5 pr-4 border-r border-[#eee]"
                    :class="{ 'border-b border-[#f0f0f0]': i < product.specs.length - 1 }"
                  >{{ spec.key }}</span>
                  <span
                    class="font-semibold text-[#222] py-2 lg:py-2.5 pl-4 pr-3 lg:pr-4"
                    :class="{ 'border-b border-[#f0f0f0]': i < product.specs.length - 1 }"
                  >{{ spec.value }}</span>
                </template>
              </div>
            </div>

            <div v-if="cartQty > 0 && cartKey" class="mt-auto flex items-center gap-3">
              <ShopQtyInput
                :qty="cartQty"
                :stock="product.stock"
                size="lg"
                @update="emit('setQty', cartKey!, $event, product.stock)"
              />
              <span class="text-[#888] text-sm">в корзине</span>
            </div>
            <button
              v-else-if="cartQty === 0"
              class="btn-primary py-2.5 lg:py-3 text-base lg:text-lg mt-auto"
              :disabled="product.stock === 0"
              :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
              @click="emit('add', product, selectedServices)"
            >Добавить в корзину</button>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.zoom-fade-enter-active,
.zoom-fade-leave-active {
  transition: opacity 0.15s ease;
}
.zoom-fade-enter-from,
.zoom-fade-leave-to {
  opacity: 0;
}
</style>
