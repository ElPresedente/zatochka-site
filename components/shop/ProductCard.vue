<script setup lang="ts">
import type { ProductDto } from '~/types/api'

const props = defineProps<{
  product: ProductDto
  cartQty: number
  canIncrease: boolean
}>()

const emit = defineEmits<{
  open: [product: ProductDto]
  add: [product: ProductDto]
  setQty: [cartKey: string, qty: number, stock: number]
}>()

const { formatPrice } = useFormatters()

const stockBadgeClass = computed(() => {
  if (props.product.stock === 0) return 'bg-red-100 text-red-500'
  if (props.product.stock < 5) return 'bg-orange-100 text-orange-500'
  return 'bg-green-100 text-green-600'
})

const stockBadgeText = computed(() => {
  if (props.product.stock === 0) return 'Нет в наличии'
  if (props.product.stock < 5) return `Осталось ${props.product.stock}`
  return 'В наличии'
})
</script>

<template>
  <div
    class="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)] flex flex-col cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.13)] hover:-translate-y-1 transition-all duration-200"
    @click="emit('open', product)"
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
        <span class="text-xs font-semibold px-2.5 py-1 rounded-lg" :class="stockBadgeClass">
          {{ stockBadgeText }}
        </span>
      </div>
      <!-- Product with services: always open modal to choose -->
      <template v-if="product.services.length > 0">
        <div v-if="cartQty > 0" class="mt-2 flex items-center justify-between gap-2" @click.stop>
          <span class="text-xs text-[#888]">В корзине: {{ cartQty }} шт.</span>
          <button class="text-xs text-brand font-semibold hover:underline" @click.stop="emit('open', product)">
            Изменить
          </button>
        </div>
        <button
          class="mt-2 btn-primary py-2.5 text-base w-full"
          :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
          :disabled="product.stock === 0"
          @click.stop="emit('open', product)"
        >{{ cartQty > 0 ? 'Добавить ещё' : 'Выбрать' }}</button>
      </template>

      <!-- Regular product: direct add or qty control -->
      <template v-else>
        <div v-if="cartQty > 0" class="mt-2 flex justify-center" @click.stop>
          <ShopQtyInput
            :qty="cartQty"
            :stock="product.stock"
            size="md"
            @update="emit('setQty', String(product.id), $event, product.stock)"
          />
        </div>
        <button
          v-else
          class="mt-2 btn-primary py-2.5 text-base w-full"
          :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
          :disabled="product.stock === 0"
          @click.stop="emit('add', product)"
        >В корзину</button>
      </template>
    </div>
  </div>
</template>
