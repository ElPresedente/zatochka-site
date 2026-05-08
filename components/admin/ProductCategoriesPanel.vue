<script setup lang="ts">
import type { ProductCategoryDto } from '~/types/api'

defineProps<{ categories: ProductCategoryDto[] | null }>()
const emit = defineEmits<{
  close: []
  changed: []
}>()

const editorOpen = ref(false)
const form = ref({ id: 0, name: '', isNew: true })

function openNew() { form.value = { id: 0, name: '', isNew: true }; editorOpen.value = true }
function openEdit(c: ProductCategoryDto) { form.value = { id: c.id, name: c.name, isNew: false }; editorOpen.value = true }

async function save() {
  if (!form.value.name.trim()) return
  if (form.value.isNew) {
    await $fetch('/api/admin/product-categories', { method: 'POST', body: { name: form.value.name } })
  } else {
    await $fetch(`/api/admin/product-categories/${form.value.id}`, { method: 'PUT', body: { name: form.value.name } })
  }
  emit('changed')
  editorOpen.value = false
}

async function remove(c: ProductCategoryDto) {
  if (!confirm(`Удалить категорию «${c.name}»?`)) return
  await $fetch(`/api/admin/product-categories/${c.id}`, { method: 'DELETE' })
  emit('changed')
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" @click.self="emit('close')">
      <div class="bg-white rounded-2xl w-full max-w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-7 py-5 border-b border-[#eee]">
          <div class="text-lg font-bold">Категории товаров</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="emit('close')">×</button>
        </div>

        <div class="flex-1 overflow-y-auto px-7 py-4">
          <div v-if="!categories?.length" class="py-8 text-center text-[#aaa] text-sm">Нет категорий</div>
          <div
            v-for="c in categories"
            :key="c.id"
            class="flex items-center justify-between py-3 border-b border-[#f0f0f0] last:border-0 group"
          >
            <span class="text-sm font-semibold text-[#222]">{{ c.name }}</span>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="px-3 py-1 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openEdit(c)">Изменить</button>
              <button class="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100" @click="remove(c)">Удалить</button>
            </div>
          </div>
        </div>

        <div class="px-7 py-4 border-t border-[#eee]">
          <button class="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)]" @click="openNew">
            + Новая категория
          </button>
        </div>
      </div>
    </div>

    <div v-if="editorOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4" @click.self="editorOpen = false">
      <div class="bg-white rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ form.isNew ? 'Новая категория' : 'Изменить категорию' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="editorOpen = false">×</button>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Название</label>
          <input
            v-model="form.name"
            type="text"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
            @keydown.enter="save"
          />
          <p v-if="!form.isNew" class="text-xs text-[#aaa] mt-2">При переименовании товары этой категории автоматически отображают новое название.</p>
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="editorOpen = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="save">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
