<script setup lang="ts">
import type { ProductDto } from '~/types/api'

const props = defineProps<{
  product: ProductDto
  cartQty: number
  canIncrease: boolean
  cartServiceData?: { price: number; serviceNames: string[] }
}>()

const emit = defineEmits<{
  open: [product: ProductDto]
  add: [product: ProductDto]
  setQty: [cartKey: string, qty: number, stock: number]
}>()

const { formatPrice } = useFormatters()

// coverPosition: new format "BSX BSY PX PY" (4 numbers) or legacy CSS string
const coverStyle = computed(() => {
  const img = `url('${props.product.photos[0] || '/images/nofoto.jpg'}')`
  const pos = props.product.coverPosition?.trim() ?? ''
  const parts = pos.split(/\s+/)
  if (parts.length === 4 && parts.every(p => p !== '' && !isNaN(Number(p)))) {
    return {
      backgroundImage: img,
      backgroundSize: `${parts[0]}% ${parts[1]}%`,
      backgroundPosition: `${parts[2]}% ${parts[3]}%`,
      backgroundRepeat: 'no-repeat',
    }
  }
  return {
    backgroundImage: img,
    backgroundSize: 'cover',
    backgroundPosition: pos || 'center center',
  }
})

const stockLabel = computed(() => {
  if (props.product.stock === 0) return { text: 'Нет в наличии', cls: 'text-red-500' }
  if (props.product.stock < 5) return { text: `Осталось ${props.product.stock} шт.`, cls: 'text-orange-500' }
  return null
})
</script>

<template>
  <div
    class="bg-white rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.07)] flex flex-col cursor-pointer hover:shadow-[0_6px_20px_rgba(0,0,0,0.13)] hover:-translate-y-0.5 transition-all duration-200"
    @click="emit('open', product)"
  >
    <!-- Фото -->
    <div
      class="relative aspect-[3/4] bg-[rgb(238,238,238)] shrink-0"
      :style="coverStyle"
    >
      <!-- Количество в корзине -->
      <span
        v-if="cartQty > 0"
        class="absolute top-1.5 left-1.5 min-w-[20px] h-5 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow"
      >{{ cartQty }}</span>
    </div>

    <!-- Информация -->
    <div class="p-2 sm:p-2.5 flex flex-col gap-1 flex-1">
      <div class="text-[11px] sm:text-xs lg:text-sm font-semibold text-[#222] leading-snug flex-1 line-clamp-3">{{ product.name }}</div>

      <div class="flex items-baseline gap-1.5 flex-wrap">
        <span class="text-sm sm:text-base lg:text-lg font-bold text-brand leading-tight">{{ formatPrice(cartServiceData?.price ?? product.price) }}</span>
        <span v-if="stockLabel" class="text-[10px] font-semibold leading-tight" :class="stockLabel.cls">{{ stockLabel.text }}</span>
      </div>
      <div v-if="cartServiceData && cartQty > 0" class="text-[9px] sm:text-[10px] text-[#888] leading-tight line-clamp-2">
        {{ cartServiceData.serviceNames.join(', ') }}
      </div>

      <div v-if="cartQty > 0" class="mt-1 flex justify-center" @click.stop>
        <ShopQtyInput
          :qty="cartQty"
          :stock="product.stock"
          size="sm"
          @update="emit('setQty', String(product.id), $event, product.stock)"
        />
      </div>
      <button
        v-else
        class="mt-1 btn-primary py-1.5 sm:py-2 text-[11px] sm:text-xs lg:text-sm w-full"
        :class="{ 'opacity-50 cursor-not-allowed': product.stock === 0 }"
        :disabled="product.stock === 0"
        @click.stop="emit('add', product)"
      >В корзину</button>
    </div>
  </div>
</template>
