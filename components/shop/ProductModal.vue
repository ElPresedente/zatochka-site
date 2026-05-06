<script setup lang="ts">
import type { ProductDto } from '~/types/api'

const props = defineProps<{
  product: ProductDto
  cartQty: number
  canIncrease: boolean
}>()

const emit = defineEmits<{
  close: []
  add: [product: ProductDto]
  setQty: [productId: number, qty: number, stock: number]
}>()

const { formatPrice } = useFormatters()

const photoIdx = ref(0)
const zoomed = ref(false)
const zoomEl = ref<HTMLElement | null>(null)

watch(() => props.product, () => {
  photoIdx.value = 0
  zoomed.value = false
})

watch(zoomed, (val) => {
  if (val) nextTick(() => zoomEl.value?.focus())
})

const multiplePhotos = computed(() => props.product.photos.length > 1)
const currentPhoto = computed(() => props.product.photos[photoIdx.value] ?? '')

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
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl max-w-[860px] w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="flex gap-8 p-8">

          <!-- Photo column -->
          <div class="flex flex-col gap-3 w-[340px] shrink-0">
            <!-- Main photo with slider -->
            <div class="relative group">
              <div
                class="h-[280px] rounded-xl bg-center bg-cover bg-[#f0f0f0] transition-opacity"
                :class="currentPhoto ? 'cursor-zoom-in' : ''"
                :style="currentPhoto ? `background-image: url('${currentPhoto}')` : ''"
                @click="currentPhoto && (zoomed = true)"
              />

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
          <div class="flex-1 flex flex-col gap-4">
            <button class="self-end text-[#aaa] hover:text-[#333] text-2xl leading-none" @click="emit('close')">×</button>
            <div class="text-sm text-[#888]">{{ product.category }}</div>
            <div class="text-[26px] font-bold text-[#111] leading-snug">{{ product.name }}</div>
            <div class="text-[30px] font-bold text-brand">{{ formatPrice(product.price) }}</div>
            <span class="text-sm font-semibold px-3 py-1 rounded-lg w-fit" :class="stockBadgeClass">
              {{ stockBadgeText }}
            </span>
            <p class="text-base text-[#555] leading-relaxed">{{ product.description }}</p>
            <div v-if="product.specs.length > 0" class="border border-[#eee] rounded-xl overflow-hidden">
              <div
                v-for="spec in product.specs"
                :key="spec.key"
                class="flex gap-4 px-4 py-2.5 text-sm border-b border-[#f0f0f0] last:border-0"
              >
                <span class="text-[#888] min-w-[140px]">{{ spec.key }}</span>
                <span class="font-semibold text-[#222]">{{ spec.value }}</span>
              </div>
            </div>
            <div v-if="cartQty > 0" class="mt-auto flex items-center gap-3">
              <ShopQtyInput
                :qty="cartQty"
                :stock="product.stock"
                size="lg"
                @update="emit('setQty', product.id, $event, product.stock)"
              />
              <span class="text-[#888] text-sm">в корзине</span>
            </div>
            <button
              v-else
              class="btn-primary py-3 text-lg mt-auto"
              :disabled="product.stock === 0"
              :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
              @click="emit('add', product)"
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
