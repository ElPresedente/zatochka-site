<script setup lang="ts">
import type { ProductCollectionDto, ProductDto } from '~/types/api'

const props = defineProps<{
  collection: ProductCollectionDto
  cartQtyById: Map<number, number>
  canIncreaseById: Map<number, boolean>
  cartPrimaryKeyById: Map<number, string | undefined>
}>()

const emit = defineEmits<{
  open: [product: ProductDto]
  add: [product: ProductDto]
  setQty: [cartKey: string, qty: number, stock: number]
}>()

// Triple items for seamless infinite loop
const tripleItems = computed(() => [
  ...props.collection.products,
  ...props.collection.products,
  ...props.collection.products,
])

const slider = ref<HTMLElement | null>(null)
let initialized = false
let scrollEndTimer: ReturnType<typeof setTimeout> | null = null

function oneSetWidth() {
  return slider.value ? slider.value.scrollWidth / 3 : 0
}

function initScroll() {
  const el = slider.value
  if (!el || initialized) return
  const w = oneSetWidth()
  if (w > 0) {
    el.style.scrollBehavior = 'auto'
    el.scrollLeft = w
    el.style.scrollBehavior = ''
    initialized = true
  }
}

function onScroll() {
  if (!initialized) return
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(snapInfinite, 60)
}

function snapInfinite() {
  const el = slider.value
  if (!el) return
  const w = oneSetWidth()
  // If in the first-copy or third-copy zone, silently jump to the middle set
  if (el.scrollLeft < w * 0.9) {
    el.style.scrollBehavior = 'auto'
    el.scrollLeft += w
    el.style.scrollBehavior = ''
  } else if (el.scrollLeft > w * 2.1) {
    el.style.scrollBehavior = 'auto'
    el.scrollLeft -= w
    el.style.scrollBehavior = ''
  }
}

function itemStep() {
  const el = slider.value
  if (!el) return 200
  const firstItem = el.firstElementChild as HTMLElement | null
  const gap = parseFloat(getComputedStyle(el).gap) || 12
  return (firstItem?.offsetWidth ?? 200) + gap
}

function scrollPrev() {
  slider.value?.scrollBy({ left: -itemStep(), behavior: 'smooth' })
}

function scrollNext() {
  slider.value?.scrollBy({ left: itemStep(), behavior: 'smooth' })
}

onMounted(() => {
  // Use rAF to ensure layout has settled
  requestAnimationFrame(() => requestAnimationFrame(initScroll))
  slider.value?.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  slider.value?.removeEventListener('scroll', onScroll)
  if (scrollEndTimer) clearTimeout(scrollEndTimer)
})
</script>

<template>
  <div class="rounded-2xl overflow-hidden border border-[#e8e8e8] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.08)]">

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-4 sm:px-5 lg:px-6 pt-4 lg:pt-5 pb-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-brand shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l1.854 3.756L14 5.528l-3 2.924.708 4.128L8 10.354l-3.708 2.226L5 8.452 2 5.528l4.146-.772z"/>
        </svg>
        <h2 class="text-xl sm:text-2xl font-bold text-[#111] leading-tight truncate">
          {{ collection.name }}
        </h2>
      </div>

      <!-- Nav arrows -->
      <div class="flex gap-1.5 shrink-0">
        <button
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#ddd] text-[#666] flex items-center justify-center transition-all hover:bg-brand hover:border-brand hover:text-white active:scale-95"
          aria-label="Назад"
          @click="scrollPrev"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <button
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#ddd] text-[#666] flex items-center justify-center transition-all hover:bg-brand hover:border-brand hover:text-white active:scale-95"
          aria-label="Вперёд"
          @click="scrollNext"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>

    <!-- Thin accent divider -->
    <div class="mx-4 sm:mx-5 lg:mx-6 h-[2px] bg-gradient-to-r from-brand/60 via-brand/20 to-transparent rounded-full mb-1" />

    <!-- Slider track -->
    <div
      ref="slider"
      class="flex gap-2 sm:gap-3 lg:gap-3.5 overflow-x-auto px-4 sm:px-5 lg:px-6 py-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        v-for="(product, i) in tripleItems"
        :key="`${i}-${product.id}`"
        class="flex-shrink-0 w-[44%] sm:w-[29%] lg:w-[21%] xl:w-[17%] 2xl:w-[14%]"
      >
        <ShopProductCard
          :product="product"
          :cart-qty="cartQtyById.get(product.id) ?? 0"
          :can-increase="canIncreaseById.get(product.id) ?? true"
          :cart-primary-key="cartPrimaryKeyById.get(product.id)"
          @open="emit('open', $event)"
          @add="emit('add', $event)"
          @set-qty="(cartKey, qty, stock) => emit('setQty', cartKey, qty, stock)"
        />
      </div>
    </div>
  </div>
</template>
