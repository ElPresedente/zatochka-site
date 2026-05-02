<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Товары' })

interface ProductCategory { id: number; name: string; sortOrder: number }
interface Spec { key: string; value: string }
interface Product {
  id: number
  name: string
  category: string
  price: number
  stock: number
  description: string
  photos: string[]
  specs: Spec[]
  active: boolean
  sortOrder: number
}

type InlineField = 'price' | 'stock'

const [{ data: products, refresh }, { data: categoriesData, refresh: refreshCategories }] = await Promise.all([
  useFetch<Product[]>('/api/admin/products'),
  useFetch<ProductCategory[]>('/api/product-categories'),
])

const categoryNames = computed(() => categoriesData.value?.map(c => c.name) ?? [])

const search = ref('')
const filterCat = ref('Все')

const filtered = computed(() => {
  let list = products.value ?? []
  if (filterCat.value !== 'Все') list = list.filter(p => p.category === filterCat.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(p => p.name.toLowerCase().includes(q))
  }
  return list
})

// ── Product editor ────────────────────────────────────────────────────
const editor = ref(false)
const isNew = ref(false)
const form = ref<Partial<Product> & { specs: Spec[]; photos: string[] }>({
  name: '', category: '', price: 0, stock: 0,
  description: '', photos: [], specs: [], active: true, sortOrder: 0,
})

function openNew() {
  isNew.value = true
  form.value = {
    name: '', category: categoryNames.value[0] ?? '', price: 0, stock: 0,
    description: '', photos: [], specs: [], active: true, sortOrder: 0,
  }
  editor.value = true
}

function openEdit(p: Product) {
  isNew.value = false
  form.value = { ...p, specs: p.specs.map(s => ({ ...s })), photos: [...p.photos] }
  editor.value = true
}

function closeEditor() { editor.value = false }

const saving = ref(false)
async function save() {
  if (!form.value.name?.trim()) return
  saving.value = true
  try {
    if (isNew.value) {
      await $fetch('/api/admin/products', { method: 'POST', body: form.value })
    } else {
      await $fetch(`/api/admin/products/${form.value.id}`, { method: 'PUT', body: form.value })
    }
    await refresh()
    closeEditor()
  } finally {
    saving.value = false
  }
}

async function toggleActive(p: Product) {
  await $fetch(`/api/admin/products/${p.id}`, { method: 'PUT', body: { active: !p.active } })
  await refresh()
}

const inlineEdit = ref<{ id: number; field: InlineField; value: string } | null>(null)
const inlineSaving = ref(false)

function inlineInputId(p: Product, field: InlineField) {
  return `product-inline-${field}-${p.id}`
}

function isInlineEditing(p: Product, field: InlineField) {
  return inlineEdit.value?.id === p.id && inlineEdit.value.field === field
}

function startInlineEdit(p: Product, field: InlineField) {
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

async function saveInlineEdit(p: Product, field: InlineField) {
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
    const updated = await $fetch<Product>(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: { [field]: nextValue },
    })
    const index = products.value?.findIndex(product => product.id === p.id) ?? -1
    if (index >= 0 && products.value) products.value[index] = updated
    inlineEdit.value = null
  } catch (err: any) {
    alert(err?.data?.message ?? 'Не удалось сохранить товар')
  } finally {
    inlineSaving.value = false
  }
}

async function deleteProduct(p: Product) {
  if (!confirm(`Удалить товар «${p.name}»?`)) return
  await $fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
  await refresh()
}

// ── Spec helpers ──────────────────────────────────────────────────────
function addSpec() { form.value.specs.push({ key: '', value: '' }) }
function removeSpec(i: number) { form.value.specs.splice(i, 1) }

// ── Photo helpers ─────────────────────────────────────────────────────
const photoUrl = ref('')
function addPhotoByUrl() {
  if (!photoUrl.value.trim()) return
  form.value.photos.push(photoUrl.value.trim())
  photoUrl.value = ''
}
function removePhoto(i: number) { form.value.photos.splice(i, 1) }

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  uploading.value = true
  uploadError.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ url: string }>('/api/admin/upload', { method: 'POST', body: fd })
    form.value.photos.push(res.url)
  } catch (err: any) {
    uploadError.value = err?.data?.message ?? 'Ошибка загрузки'
  } finally {
    uploading.value = false
  }
}

// ── Category management ───────────────────────────────────────────────
const catPanel = ref(false)
const catEditor = ref(false)
const catForm = ref({ id: 0, name: '', isNew: true })

function openNewCat() { catForm.value = { id: 0, name: '', isNew: true }; catEditor.value = true }
function openEditCat(c: ProductCategory) { catForm.value = { id: c.id, name: c.name, isNew: false }; catEditor.value = true }

async function saveCat() {
  if (!catForm.value.name.trim()) return
  if (catForm.value.isNew) {
    await $fetch('/api/admin/product-categories', { method: 'POST', body: { name: catForm.value.name } })
  } else {
    await $fetch(`/api/admin/product-categories/${catForm.value.id}`, { method: 'PUT', body: { name: catForm.value.name } })
  }
  await refreshCategories()
  catEditor.value = false
}

async function deleteCat(c: ProductCategory) {
  if (!confirm(`Удалить категорию «${c.name}»?`)) return
  await $fetch(`/api/admin/product-categories/${c.id}`, { method: 'DELETE' })
  await refreshCategories()
}

function formatPrice(p: number) {
  return p.toLocaleString('ru-RU') + ' ₽'
}
</script>

<template>
  <!-- Header -->
  <div class="bg-white border-b border-[#eee] px-8 py-5 flex items-center justify-between shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Товары магазина</h1>
    <div class="flex gap-3">
      <button
        class="px-5 py-2.5 rounded-xl border-2 border-brand text-brand font-bold text-sm hover:bg-brand/10 transition-colors"
        @click="catPanel = true"
      >Категории</button>
      <button
        class="bg-brand text-white rounded-xl px-5 py-2.5 font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)]"
        @click="openNew"
      >+ Добавить товар</button>
    </div>
  </div>

  <!-- Filters -->
  <div class="bg-white border-b border-[#eee] px-8 py-3 flex gap-3 items-center shrink-0">
    <input
      v-model="search"
      type="text"
      placeholder="Поиск..."
      class="border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand transition-colors w-[220px]"
    />
    <div class="flex gap-2 flex-wrap">
      <button
        v-for="cat in ['Все', ...categoryNames]"
        :key="cat"
        class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
        :class="filterCat === cat ? 'bg-brand text-white border-brand' : 'border-[#e0e0e0] text-[#555] hover:border-brand hover:text-brand'"
        @click="filterCat = cat"
      >{{ cat }}</button>
    </div>
    <span class="text-sm text-[#aaa] ml-auto">{{ filtered.length }} товаров</span>
  </div>

  <!-- Table -->
  <div class="flex-1 overflow-y-auto px-8 py-6">
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
            v-for="p in filtered"
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
                @click="toggleActive(p)"
              >{{ p.active ? 'Активен' : 'Скрыт' }}</button>
            </td>
            <td class="px-5 py-3">
              <div class="flex gap-2 justify-end">
                <button class="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition-colors" @click="openEdit(p)">Изменить</button>
                <button class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors" @click="deleteProduct(p)">Удалить</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filtered.length === 0" class="py-16 text-center text-[#aaa]">Нет товаров</div>
    </div>
  </div>

  <!-- Product editor modal -->
  <Teleport to="body">
    <div
      v-if="editor"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
      @click.self="closeEditor"
    >
      <div class="bg-white rounded-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-7 py-5 border-b border-[#eee]">
          <div class="text-lg font-bold">{{ isNew ? 'Новый товар' : 'Редактировать товар' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="closeEditor">×</button>
        </div>

        <div class="flex-1 overflow-y-auto px-7 py-5 flex flex-col gap-5">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Название *</label>
              <input v-model="form.name" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Категория</label>
              <select v-model="form.category" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand bg-white">
                <option v-for="cat in categoryNames" :key="cat">{{ cat }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Активен</label>
              <div class="flex items-center gap-3 pt-2">
                <input id="active-toggle" v-model="form.active" type="checkbox" class="w-4 h-4 accent-brand" />
                <label for="active-toggle" class="text-sm text-[#444]">Показывать в магазине</label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Цена (₽)</label>
              <input v-model.number="form.price" type="number" min="0" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Остаток (шт.)</label>
              <input v-model.number="form.stock" type="number" min="0" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-semibold text-[#777] mb-1.5">Описание</label>
              <textarea v-model="form.description" rows="3" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none" />
            </div>
          </div>

          <!-- Photos -->
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-2">Фотографии</label>

            <!-- URL input -->
            <div class="flex gap-2 mb-2">
              <input
                v-model="photoUrl"
                type="text"
                placeholder="Вставить URL..."
                class="flex-1 border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand"
                @keydown.enter.prevent="addPhotoByUrl"
              />
              <button class="px-4 py-2 bg-brand/10 text-brand rounded-xl text-sm font-semibold hover:bg-brand/20 transition-colors whitespace-nowrap" @click="addPhotoByUrl">
                + URL
              </button>
            </div>

            <!-- File upload -->
            <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="onFileChange" />
            <button
              class="w-full py-2.5 border-2 border-dashed border-[#ddd] rounded-xl text-sm text-[#888] hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              :disabled="uploading"
              @click="fileInput?.click()"
            >
              <svg v-if="!uploading" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <svg v-else class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {{ uploading ? 'Загрузка...' : 'Загрузить с компьютера' }}
            </button>
            <p v-if="uploadError" class="text-xs text-red-500 mt-1.5">{{ uploadError }}</p>

            <!-- Preview grid -->
            <div v-if="form.photos.length > 0" class="flex gap-2 flex-wrap mt-3">
              <div v-for="(ph, i) in form.photos" :key="i" class="relative group">
                <div class="w-20 h-20 rounded-xl bg-center bg-cover bg-[#eee]" :style="ph ? `background-image: url('${ph}')` : ''" />
                <button
                  class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removePhoto(i)"
                >×</button>
              </div>
            </div>
          </div>

          <!-- Specs -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-semibold text-[#777]">Характеристики</label>
              <button class="text-xs text-brand font-semibold hover:underline" @click="addSpec">+ Добавить</button>
            </div>
            <div v-for="(spec, i) in form.specs" :key="i" class="flex gap-2 mb-2">
              <input v-model="spec.key" type="text" placeholder="Параметр" class="flex-1 border border-[#ddd] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand" />
              <input v-model="spec.value" type="text" placeholder="Значение" class="flex-1 border border-[#ddd] rounded-xl px-3 py-2 text-sm outline-none focus:border-brand" />
              <button class="w-8 h-9 text-[#aaa] hover:text-red-400 flex items-center justify-center text-xl" @click="removeSpec(i)">×</button>
            </div>
          </div>
        </div>

        <div class="px-7 py-5 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-6 py-2.5 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5] transition-colors" @click="closeEditor">Отмена</button>
          <button
            class="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold shadow-[0_3px_0_rgba(9,136,189,0.5)] hover:brightness-110 transition-all disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Categories panel -->
  <Teleport to="body">
    <div v-if="catPanel" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" @click.self="catPanel = false">
      <div class="bg-white rounded-2xl w-full max-w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-7 py-5 border-b border-[#eee]">
          <div class="text-lg font-bold">Категории товаров</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="catPanel = false">×</button>
        </div>

        <div class="flex-1 overflow-y-auto px-7 py-4">
          <div v-if="!categoriesData?.length" class="py-8 text-center text-[#aaa] text-sm">Нет категорий</div>
          <div
            v-for="c in categoriesData"
            :key="c.id"
            class="flex items-center justify-between py-3 border-b border-[#f0f0f0] last:border-0 group"
          >
            <span class="text-sm font-semibold text-[#222]">{{ c.name }}</span>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="px-3 py-1 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openEditCat(c)">✏️ Изменить</button>
              <button class="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100" @click="deleteCat(c)">Удалить</button>
            </div>
          </div>
        </div>

        <div class="px-7 py-4 border-t border-[#eee]">
          <button class="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)]" @click="openNewCat">
            + Новая категория
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Category editor modal -->
  <Teleport to="body">
    <div v-if="catEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4" @click.self="catEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ catForm.isNew ? 'Новая категория' : 'Изменить категорию' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="catEditor = false">×</button>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Название</label>
          <input
            v-model="catForm.name"
            type="text"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand"
            @keydown.enter="saveCat"
          />
          <p v-if="!catForm.isNew" class="text-xs text-[#aaa] mt-2">При переименовании все товары этой категории обновятся автоматически.</p>
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="catEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveCat">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
