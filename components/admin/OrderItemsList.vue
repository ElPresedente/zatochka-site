<script setup lang="ts">
import type { OrderItemDto, OrderItemService } from '~/types/api'

interface FormItem extends OrderItemDto {
  serviceIds: string[]
}

defineProps<{
  items: FormItem[]
  editable: boolean
  subtotal: number
}>()

const emit = defineEmits<{
  'update:quantity': [index: number, value: number]
  'update:unitPrice': [index: number, value: number]
  remove: [index: number]
  'add-request': []
}>()

const { formatPrice } = useFormatters()

function onUnitPriceInput(index: number, e: Event) {
  emit('update:unitPrice', index, Number((e.target as HTMLInputElement).value))
}

function onQuantityInput(index: number, e: Event) {
  emit('update:quantity', index, Number((e.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="px-4 lg:px-7 py-4 lg:py-5 border-b border-[#eee]">
    <h2 class="text-sm font-bold text-[#222] mb-3">Состав заказа</h2>

    <div v-if="editable" class="mb-3">
      <button
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#ddd] text-sm text-[#777] hover:border-brand hover:text-brand transition-colors w-full justify-center"
        @click="emit('add-request')"
      >
        <span class="text-lg leading-none font-bold">+</span>
        Выбрать товары из каталога
      </button>
    </div>

    <div class="border border-[#eee] rounded-xl overflow-hidden">
      <!-- Desktop grid header -->
      <div v-if="items.length > 0" class="hidden lg:grid grid-cols-[56px_1fr_100px_80px_110px_auto] gap-3 items-center px-4 py-2 bg-[#fafafa] border-b border-[#eee] text-xs font-semibold text-[#888]">
        <div />
        <div>Товар</div>
        <div class="text-right">Цена, ₽</div>
        <div class="text-right">Кол-во</div>
        <div class="text-right">Итого</div>
        <div v-if="editable" />
      </div>

      <!-- Desktop rows -->
      <div
        v-for="(item, index) in items"
        :key="`d-${item.id}`"
        class="hidden lg:grid grid-cols-[56px_1fr_100px_80px_110px_auto] gap-3 items-start px-4 py-3 border-b border-[#f0f0f0] last:border-0"
      >
        <div
          class="w-14 h-14 rounded-xl bg-center bg-cover bg-[#eee] shrink-0"
          :style="item.productPhoto ? `background-image: url('${item.productPhoto}')` : ''"
        />
        <div>
          <div class="font-semibold text-[#222] text-sm leading-snug">{{ item.productName }}</div>
          <div v-if="(item.services as OrderItemService[]).length > 0" class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="svc in (item.services as OrderItemService[])"
              :key="svc.name"
              class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300"
            >
              ★ {{ svc.name }} <span class="opacity-70">(+{{ formatPrice(svc.price) }})</span>
            </span>
          </div>
        </div>

        <input
          v-if="editable"
          :value="item.unitPrice"
          type="number"
          min="0"
          step="1"
          class="w-full border border-[#ddd] rounded-xl px-2 py-2 text-sm text-right outline-none focus:border-brand"
          @input="onUnitPriceInput(index, $event)"
        />
        <div v-else class="text-sm text-right text-[#555] pt-1">{{ formatPrice(item.unitPrice) }}</div>

        <input
          v-if="editable"
          :value="item.quantity"
          type="number"
          min="1"
          step="1"
          class="w-full border border-[#ddd] rounded-xl px-2 py-2 text-sm text-right outline-none focus:border-brand"
          @input="onQuantityInput(index, $event)"
        />
        <div v-else class="text-sm text-right text-[#555] pt-1">{{ item.quantity }} шт.</div>

        <div class="font-bold text-[#222] text-right pt-1">{{ formatPrice(item.totalPrice) }}</div>

        <button
          v-if="editable"
          class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors"
          @click="emit('remove', index)"
        >
          Удалить
        </button>
        <div v-else />
      </div>

      <!-- Mobile cards -->
      <div
        v-for="(item, index) in items"
        :key="`m-${item.id}`"
        class="lg:hidden flex flex-col gap-2 p-3 border-b border-[#f0f0f0] last:border-0"
      >
        <div class="flex gap-3 items-start">
          <div
            class="w-12 h-12 rounded-xl bg-center bg-cover bg-[#eee] shrink-0"
            :style="item.productPhoto ? `background-image: url('${item.productPhoto}')` : ''"
          />
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-[#222] text-sm leading-snug">{{ item.productName }}</div>
            <div v-if="(item.services as OrderItemService[]).length > 0" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="svc in (item.services as OrderItemService[])"
                :key="svc.name"
                class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300"
              >
                ★ {{ svc.name }} (+{{ formatPrice(svc.price) }})
              </span>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 items-end">
          <div>
            <label class="block text-[10px] uppercase tracking-wide font-semibold text-[#888] mb-1">Цена, ₽</label>
            <input
              v-if="editable"
              :value="item.unitPrice"
              type="number"
              min="0"
              step="1"
              class="w-full border border-[#ddd] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-brand"
              @input="onUnitPriceInput(index, $event)"
            />
            <div v-else class="text-sm text-[#555]">{{ formatPrice(item.unitPrice) }}</div>
          </div>
          <div>
            <label class="block text-[10px] uppercase tracking-wide font-semibold text-[#888] mb-1">Кол-во</label>
            <input
              v-if="editable"
              :value="item.quantity"
              type="number"
              min="1"
              step="1"
              class="w-full border border-[#ddd] rounded-lg px-2 py-1.5 text-sm outline-none focus:border-brand"
              @input="onQuantityInput(index, $event)"
            />
            <div v-else class="text-sm text-[#555]">{{ item.quantity }} шт.</div>
          </div>
        </div>
        <div class="flex items-center justify-between gap-3 pt-1 border-t border-[#f5f5f5]">
          <div class="font-bold text-[#222] text-sm">Итого: {{ formatPrice(item.totalPrice) }}</div>
          <button
            v-if="editable"
            class="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors shrink-0"
            @click="emit('remove', index)"
          >
            Удалить
          </button>
        </div>
      </div>

      <div v-if="items.length === 0" class="px-4 py-8 text-center text-sm text-[#aaa]">
        Добавьте хотя бы одну позицию
      </div>
    </div>

    <div v-if="editable" class="mt-3 text-right text-sm text-[#555]">
      Сумма по позициям: <span class="font-bold text-brand">{{ formatPrice(subtotal) }}</span>
    </div>
  </div>
</template>
