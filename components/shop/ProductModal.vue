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
watch(() => props.product, () => { photoIdx.value = 0 })

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
    <div
      class="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl max-w-[860px] w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div class="flex gap-8 p-8">
          <div class="flex flex-col gap-3 w-[340px] shrink-0">
            <div
              class="h-[280px] rounded-xl bg-center bg-cover bg-[#f0f0f0]"
              :style="product.photos[photoIdx] ? `background-image: url('${product.photos[photoIdx]}')` : ''"
            />
            <div v-if="product.photos.length > 1" class="flex gap-2 flex-wrap">
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
              <button
                class="w-11 h-11 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center"
                @click="emit('setQty', product.id, cartQty - 1, product.stock)"
              >−</button>
              <span class="font-bold text-[#222] text-xl min-w-[32px] text-center">{{ cartQty }}</span>
              <button
                class="w-11 h-11 rounded-xl bg-[#f0f0f0] font-bold text-xl hover:bg-brand hover:text-white transition-colors flex items-center justify-center disabled:opacity-40 disabled:hover:bg-[#f0f0f0] disabled:hover:text-inherit"
                :disabled="!canIncrease"
                @click="emit('setQty', product.id, cartQty + 1, product.stock)"
              >+</button>
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
