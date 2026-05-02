<script setup lang="ts">
import type { ProductDto } from '~/types/api'

type InlineField = 'price' | 'stock'

const props = defineProps<{ products: ProductDto[] }>()
const emit = defineEmits<{
  edit: [product: ProductDto]
  toggle: [product: ProductDto]
  remove: [product: ProductDto]
  inlineSaved: [product: ProductDto]
}>()

const { formatPrice } = useFormatters()

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
  <div class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-[#f8f8f8] border-b border-[#eee]">
        <tr>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Фото</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Название</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Категория</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Цена</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Остаток</th>
          <th class="text-left px-5 py-3 font-semibold text-[#555]">Статус</th>
          <th class="px-5 py-3" />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="p in products"
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
</template>
