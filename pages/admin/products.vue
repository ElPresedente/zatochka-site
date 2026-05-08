<script setup lang="ts">
import type { ProductDto, ProductCategoryDto } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Товары' })

const [{ data: products, refresh }, { data: categoriesData, refresh: refreshCategories }] = await Promise.all([
  useFetch<ProductDto[]>('/api/admin/products'),
  useFetch<ProductCategoryDto[]>('/api/product-categories'),
])

const categories = computed(() => categoriesData.value ?? [])

const search = ref('')
const filterCat = ref('Все')

const filtered = computed(() => {
  let list = products.value ?? []
  if (filterCat.value !== 'Все') list = list.filter(p => p.categoryId === Number(filterCat.value))
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q))
  }
  return list
})

const editorOpen = ref(false)
const editingProduct = ref<ProductDto | null>(null)

function openNew() {
  editingProduct.value = null
  editorOpen.value = true
}

function openEdit(p: ProductDto) {
  editingProduct.value = p
  editorOpen.value = true
}

async function toggleActive(p: ProductDto) {
  await $fetch(`/api/admin/products/${p.id}`, { method: 'PUT', body: { active: !p.active } })
  await refresh()
}

async function deleteProduct(p: ProductDto) {
  if (!confirm(`Удалить товар «${p.name}»?`)) return
  await $fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
  await refresh()
}

function onInlineSaved(updated: ProductDto) {
  if (!products.value) return
  const index = products.value.findIndex(p => p.id === updated.id)
  if (index >= 0) products.value[index] = updated
}

const catPanelOpen = ref(false)
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-8 py-5 flex items-center justify-between shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Товары магазина</h1>
    <div class="flex gap-3">
      <button
        class="px-5 py-2.5 rounded-xl border-2 border-brand text-brand font-bold text-sm hover:bg-brand/10 transition-colors"
        @click="catPanelOpen = true"
      >Категории</button>
      <button
        class="bg-brand text-white rounded-xl px-5 py-2.5 font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)]"
        @click="openNew"
      >+ Добавить товар</button>
    </div>
  </div>

  <div class="bg-white border-b border-[#eee] px-8 py-3 flex gap-3 items-center shrink-0">
    <input
      v-model="search"
      type="text"
      placeholder="Поиск..."
      class="border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand transition-colors w-[220px]"
    />
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="cat in [{ id: 'Все', name: 'Все' }, ...categories.map(c => ({ id: String(c.id), name: c.name }))]"
        :key="cat.id"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
        :class="filterCat === cat.id ? 'bg-brand text-white border-brand' : 'border-[#e0e0e0] text-[#555] hover:border-brand hover:text-brand'"
        @click="filterCat = cat.id"
      >{{ cat.name }}</button>
    </div>
    <span class="text-sm text-[#aaa] ml-auto">{{ filtered.length }} товаров</span>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    <AdminProductsTable
      :products="filtered"
      @edit="openEdit"
      @toggle="toggleActive"
      @remove="deleteProduct"
      @inline-saved="onInlineSaved"
    />
  </div>

  <AdminProductEditModal
    v-if="editorOpen"
    :product="editingProduct"
    :categories="categories"
    @close="editorOpen = false"
    @saved="refresh"
  />

  <AdminProductCategoriesPanel
    v-if="catPanelOpen"
    :categories="categoriesData"
    @close="catPanelOpen = false"
    @changed="refreshCategories"
  />
</template>
