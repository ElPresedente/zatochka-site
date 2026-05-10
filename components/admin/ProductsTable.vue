<script setup lang="ts">
import type { ProductDto } from '~/types/api'

type InlineField = 'price' | 'stock'
type SortKey = 'name' | 'category' | 'price' | 'stock' | 'active'
type SortDir = 'asc' | 'desc'

const props = defineProps<{ products: ProductDto[] }>()
const emit = defineEmits<{
  edit: [product: ProductDto]
  toggle: [product: ProductDto]
  remove: [product: ProductDto]
  inlineSaved: [product: ProductDto]
}>()

const { formatPrice } = useFormatters()

// ── Sort ──────────────────────────────────────────────────────────────
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<SortDir>('asc')

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    if (sortDir.value === 'asc') sortDir.value = 'desc'
    else resetSort()
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function resetSort() {
  sortKey.value = null
  sortDir.value = 'asc'
}

const sorted = computed(() => {
  if (!sortKey.value) return props.products
  const key = sortKey.value
  const mul = sortDir.value === 'asc' ? 1 : -1
  return [...props.products].sort((a, b) => {
    if (key === 'active') return ((a.active ? 0 : 1) - (b.active ? 0 : 1)) * mul
    const va = a[key]
    const vb = b[key]
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb, 'ru') * mul
    if (va < vb) return -mul
    if (va > vb) return mul
    return 0
  })
})

// ── Inline edit ───────────────────────────────────────────────────────
const inlineEdit = ref<{ id: number; field: InlineField; value: string } | null>(null)
const inlineSaving = ref(false)

function inlineInputId(p: ProductDto, field: InlineField) {
  return `product-inline-${field}-${p.id}`
}

function isInlineEditing(p: ProductDto, field: InlineField) {
  return inlineEdit.value?.id === p.id && inlineEdit.value.field === field
}

function startInlineEdit(p: ProductDto, field: InlineField) {
  if (inlineSaving.value) return
  inlineEdit.value = { id: p.id, field, value: String(p[field]) }
  nextTick(() => {
    const input = document.getElementById(inlineInputId(p, field)) as HTMLInputElement | null
    input?.focus()
    input?.select()
  })
}

function cancelInlineEdit() {
  if (inlineSaving.value) return
  inlineEdit.value = null
}

async function saveInlineEdit(p: ProductDto, field: InlineField) {
  const edit = inlineEdit.value
  if (!edit || edit.id !== p.id || edit.field !== field || inlineSaving.value) return

  const nextValue = Number(edit.value)
  if (!Number.isInteger(nextValue) || nextValue < 0) {
    alert(field === 'price' ? 'Цена должна быть целым числом не меньше 0' : 'Остаток должен быть целым числом не меньше 0')
    return
  }

  if (nextValue === p[field]) {
    inlineEdit.value = null
    return
  }

  inlineSaving.value = true
  try {
    const updated = await $fetch<ProductDto>(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: { [field]: nextValue },
    })
    emit('inlineSaved', updated)
    inlineEdit.value = null
  } catch (err: any) {
    alert(err?.data?.message ?? 'Не удалось сохранить товар')
  } finally {
    inlineSaving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Desktop table -->
    <div class="hidden lg:block bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-[#f8f8f8] border-b border-[#eee]">
        <tr>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Фото</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">
            <button
              class="flex items-center gap-1 hover:text-brand transition-colors group"
              :class="sortKey === 'name' ? 'text-brand' : ''"
              @click="setSort('name')"
            >
              Название
              <span class="text-xs w-3 text-center">
                <template v-if="sortKey === 'name'">{{ sortDir === 'asc' ? '↑' : '↓' }}</template>
                <template v-else><span class="text-[#ccc] group-hover:text-[#aaa]">↕</span></template>
              </span>
            </button>
          </th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">
            <button
              class="flex items-center gap-1 hover:text-brand transition-colors group"
              :class="sortKey === 'category' ? 'text-brand' : ''"
              @click="setSort('category')"
            >
              Категория
              <span class="text-xs w-3 text-center">
                <template v-if="sortKey === 'category'">{{ sortDir === 'asc' ? '↑' : '↓' }}</template>
                <template v-else><span class="text-[#ccc] group-hover:text-[#aaa]">↕</span></template>
              </span>
            </button>
          </th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">
            <button
              class="flex items-center gap-1 hover:text-brand transition-colors group"
              :class="sortKey === 'price' ? 'text-brand' : ''"
              @click="setSort('price')"
            >
              Цена
              <span class="text-xs w-3 text-center">
                <template v-if="sortKey === 'price'">{{ sortDir === 'asc' ? '↑' : '↓' }}</template>
                <template v-else><span class="text-[#ccc] group-hover:text-[#aaa]">↕</span></template>
              </span>
            </button>
          </th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">
            <button
              class="flex items-center gap-1 hover:text-brand transition-colors group"
              :class="sortKey === 'stock' ? 'text-brand' : ''"
              @click="setSort('stock')"
            >
              Остаток
              <span class="text-xs w-3 text-center">
                <template v-if="sortKey === 'stock'">{{ sortDir === 'asc' ? '↑' : '↓' }}</template>
                <template v-else><span class="text-[#ccc] group-hover:text-[#aaa]">↕</span></template>
              </span>
            </button>
          </th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">
            <button
              class="flex items-center gap-1 hover:text-brand transition-colors group"
              :class="sortKey === 'active' ? 'text-brand' : ''"
              @click="setSort('active')"
            >
              Статус
              <span class="text-xs w-3 text-center">
                <template v-if="sortKey === 'active'">{{ sortDir === 'asc' ? '↑' : '↓' }}</template>
                <template v-else><span class="text-[#ccc] group-hover:text-[#aaa]">↕</span></template>
              </span>
            </button>
          </th>
          <th class="px-5 py-3 text-right">
            <button
              v-if="sortKey"
              class="text-xs text-[#aaa] hover:text-red-400 transition-colors font-normal"
              @click="resetSort"
            >
              Сбросить ↺
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in sorted"
          :key="p.id"
          class="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors"
        >
          <td class="px-5 py-3">
            <div
              class="w-12 h-12 rounded-xl bg-center bg-cover bg-[#eee]"
              :style="p.photos[0] ? `background-image: url('${p.photos[0]}')` : ''"
            />
          </td>
          <td class="px-5 py-3 font-semibold text-[#222] max-w-[240px]">{{ p.name }}</td>
          <td class="px-5 py-3 text-[#777]">{{ p.category }}</td>
          <td class="px-5 py-3">
            <input
              v-if="isInlineEditing(p, 'price')"
              :id="inlineInputId(p, 'price')"
              v-model="inlineEdit!.value"
              type="number"
              min="0"
              step="1"
              class="w-28 rounded-lg border border-brand px-2.5 py-1 text-sm font-bold text-brand outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              :disabled="inlineSaving"
              @blur="saveInlineEdit(p, 'price')"
              @keydown.enter.prevent="saveInlineEdit(p, 'price')"
              @keydown.esc.prevent="cancelInlineEdit"
            />
            <button
              v-else
              class="rounded-lg px-2.5 py-1 -ml-2.5 font-bold text-brand transition-colors hover:bg-brand/10"
              title="Изменить цену"
              @click="startInlineEdit(p, 'price')"
            >
              {{ formatPrice(p.price) }}
            </button>
          </td>
          <td class="px-5 py-3">
            <input
              v-if="isInlineEditing(p, 'stock')"
              :id="inlineInputId(p, 'stock')"
              v-model="inlineEdit!.value"
              type="number"
              min="0"
              step="1"
              class="w-20 rounded-lg border border-brand px-2.5 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              :disabled="inlineSaving"
              @blur="saveInlineEdit(p, 'stock')"
              @keydown.enter.prevent="saveInlineEdit(p, 'stock')"
              @keydown.esc.prevent="cancelInlineEdit"
            />
            <span
              v-else
              class="px-2.5 py-1 rounded-lg font-semibold text-xs cursor-pointer transition-colors hover:ring-2 hover:ring-brand/20"
              :class="p.stock === 0 ? 'bg-red-100 text-red-500' : p.stock < 5 ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'"
              title="Изменить остаток"
              @click="startInlineEdit(p, 'stock')"
            >{{ p.stock }} шт.</span>
          </td>
          <td class="px-5 py-3">
            <button
              class="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
              :class="p.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#eee] text-[#999] hover:bg-[#e0e0e0]'"
              @click="emit('toggle', p)"
            >{{ p.active ? 'Активен' : 'Скрыт' }}</button>
          </td>
          <td class="px-5 py-3">
            <div class="flex gap-2 justify-end">
              <button class="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition-colors" @click="emit('edit', p)">Изменить</button>
              <button class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors" @click="emit('remove', p)">Удалить</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="products.length === 0" class="py-16 text-center text-[#aaa]">Нет товаров</div>
    </div>

    <!-- Mobile cards -->
    <div class="lg:hidden flex flex-col gap-3">
      <div
        v-for="p in sorted"
        :key="p.id"
        class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden flex flex-col"
      >
        <div class="flex gap-3 p-3">
          <div
            class="w-16 h-16 rounded-xl bg-center bg-cover bg-[#eee] shrink-0"
            :style="p.photos[0] ? `background-image: url('${p.photos[0]}')` : ''"
          />
          <div class="flex-1 min-w-0 flex flex-col gap-1">
            <div class="font-semibold text-[#222] text-sm leading-snug line-clamp-2">{{ p.name }}</div>
            <div class="text-xs text-[#888]">{{ p.category }}</div>
            <button
              class="self-start px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
              :class="p.active ? 'bg-green-100 text-green-700' : 'bg-[#eee] text-[#999]'"
              @click="emit('toggle', p)"
            >{{ p.active ? 'Активен' : 'Скрыт' }}</button>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 px-3 pb-2">
          <div class="flex flex-col gap-1">
            <div class="text-[10px] uppercase tracking-wide font-semibold text-[#888]">Цена</div>
            <input
              v-if="isInlineEditing(p, 'price')"
              :id="inlineInputId(p, 'price')"
              v-model="inlineEdit!.value"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-lg border border-brand px-2.5 py-1.5 text-sm font-bold text-brand outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              :disabled="inlineSaving"
              @blur="saveInlineEdit(p, 'price')"
              @keydown.enter.prevent="saveInlineEdit(p, 'price')"
              @keydown.esc.prevent="cancelInlineEdit"
            />
            <button
              v-else
              class="self-start rounded-lg px-2.5 py-1 font-bold text-brand transition-colors hover:bg-brand/10"
              @click="startInlineEdit(p, 'price')"
            >
              {{ formatPrice(p.price) }}
            </button>
          </div>
          <div class="flex flex-col gap-1">
            <div class="text-[10px] uppercase tracking-wide font-semibold text-[#888]">Остаток</div>
            <input
              v-if="isInlineEditing(p, 'stock')"
              :id="inlineInputId(p, 'stock')"
              v-model="inlineEdit!.value"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-lg border border-brand px-2.5 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              :disabled="inlineSaving"
              @blur="saveInlineEdit(p, 'stock')"
              @keydown.enter.prevent="saveInlineEdit(p, 'stock')"
              @keydown.esc.prevent="cancelInlineEdit"
            />
            <span
              v-else
              class="self-start px-2.5 py-1 rounded-lg font-semibold text-xs cursor-pointer transition-colors"
              :class="p.stock === 0 ? 'bg-red-100 text-red-500' : p.stock < 5 ? 'bg-orange-100 text-orange-500' : 'bg-green-100 text-green-600'"
              @click="startInlineEdit(p, 'stock')"
            >{{ p.stock }} шт.</span>
          </div>
        </div>
        <div class="flex gap-2 px-3 pb-3 border-t border-[#f4f4f4] pt-2">
          <button class="flex-1 px-3 py-2 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition-colors" @click="emit('edit', p)">Изменить</button>
          <button class="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors" @click="emit('remove', p)">Удалить</button>
        </div>
      </div>
      <div v-if="products.length === 0" class="bg-white rounded-2xl border border-[#eee] py-12 text-center text-[#aaa]">Нет товаров</div>
    </div>
  </div>
</template>
