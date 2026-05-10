<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Прайс' })

interface ServiceItem { id: number; categoryId: number; name: string; price: string; sortOrder: number }
interface ServiceCategory { id: number; title: string; sortOrder: number; items: ServiceItem[] }
interface ServiceNote { id: number; content: string; sortOrder: number }

const { data, refresh } = await useFetch<{ categories: ServiceCategory[]; notes: ServiceNote[] }>('/api/services')
const categories = computed(() => data.value?.categories ?? [])
const notes = computed(() => data.value?.notes ?? [])

// ── Drag-and-drop state ───────────────────────────────────────────────
const localItems = ref<Record<number, ServiceItem[]>>({})
const dirtyCategories = ref<Set<number>>(new Set())
const dragging = ref<{ catId: number; index: number } | null>(null)
const dragOverPos = ref<{ catId: number; index: number } | null>(null)

watch(() => data.value?.categories, (cats) => {
  if (!cats) return
  for (const cat of cats) {
    if (!dirtyCategories.value.has(cat.id)) {
      localItems.value[cat.id] = [...cat.items]
    }
  }
}, { immediate: true, deep: true })

function onDragStart(catId: number, index: number, e: DragEvent) {
  dragging.value = { catId, index }
  e.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(catId: number, index: number) {
  if (dragging.value?.catId === catId) {
    dragOverPos.value = { catId, index }
  }
}

function onDrop(catId: number, toIndex: number) {
  if (!dragging.value || dragging.value.catId !== catId) return
  const fromIndex = dragging.value.index
  if (fromIndex === toIndex) return
  const items = [...localItems.value[catId]]
  const [moved] = items.splice(fromIndex, 1)
  items.splice(toIndex, 0, moved)
  localItems.value[catId] = items
  dirtyCategories.value = new Set([...dirtyCategories.value, catId])
}

function onDragEnd() {
  dragging.value = null
  dragOverPos.value = null
}

async function saveOrder(catId: number) {
  const items = localItems.value[catId]
  await $fetch('/api/admin/service-items/reorder', {
    method: 'POST',
    body: { items: items.map((item, i) => ({ id: item.id, sortOrder: i })) },
  })
  dirtyCategories.value = new Set([...dirtyCategories.value].filter(id => id !== catId))
  await refresh()
}

// ── Category CRUD ─────────────────────────────────────────────────────
const catEditor = ref(false)
const catForm = ref({ id: 0, title: '', isNew: true })

function openNewCat() { catForm.value = { id: 0, title: '', isNew: true }; catEditor.value = true }
function openEditCat(c: ServiceCategory) { catForm.value = { id: c.id, title: c.title, isNew: false }; catEditor.value = true }

async function saveCat() {
  if (!catForm.value.title.trim()) return
  if (catForm.value.isNew) {
    await $fetch('/api/admin/service-categories', { method: 'POST', body: { title: catForm.value.title, sortOrder: categories.value.length } })
  } else {
    await $fetch(`/api/admin/service-categories/${catForm.value.id}`, { method: 'PUT', body: { title: catForm.value.title } })
  }
  await refresh(); catEditor.value = false
}

async function deleteCat(c: ServiceCategory) {
  if (!confirm(`Удалить категорию «${c.title}» и все позиции в ней?`)) return
  await $fetch(`/api/admin/service-categories/${c.id}`, { method: 'DELETE' })
  await refresh()
}

// ── Item CRUD ─────────────────────────────────────────────────────────
const itemEditor = ref(false)
const itemForm = ref({ id: 0, categoryId: 0, name: '', price: '', isNew: true })

function openNewItem(categoryId: number) {
  itemForm.value = { id: 0, categoryId, name: '', price: '', isNew: true }
  itemEditor.value = true
}
function openEditItem(item: ServiceItem) {
  itemForm.value = { ...item, isNew: false }
  itemEditor.value = true
}

async function saveItem() {
  if (!itemForm.value.name.trim()) return
  const catId = itemForm.value.categoryId
  dirtyCategories.value = new Set([...dirtyCategories.value].filter(id => id !== catId))
  if (itemForm.value.isNew) {
    await $fetch('/api/admin/service-items', { method: 'POST', body: itemForm.value })
  } else {
    await $fetch(`/api/admin/service-items/${itemForm.value.id}`, { method: 'PUT', body: itemForm.value })
  }
  await refresh(); itemEditor.value = false
}

async function deleteItem(item: ServiceItem) {
  if (!confirm(`Удалить «${item.name}»?`)) return
  dirtyCategories.value = new Set([...dirtyCategories.value].filter(id => id !== item.categoryId))
  await $fetch(`/api/admin/service-items/${item.id}`, { method: 'DELETE' })
  await refresh()
}

// ── Notes CRUD ────────────────────────────────────────────────────────
const noteEditor = ref(false)
const noteForm = ref({ id: 0, content: '', isNew: true })

function openNewNote() { noteForm.value = { id: 0, content: '', isNew: true }; noteEditor.value = true }
function openEditNote(n: ServiceNote) { noteForm.value = { id: n.id, content: n.content, isNew: false }; noteEditor.value = true }

async function saveNote() {
  if (!noteForm.value.content.trim()) return
  if (noteForm.value.isNew) {
    await $fetch('/api/admin/service-notes', { method: 'POST', body: { content: noteForm.value.content, sortOrder: notes.value.length } })
  } else {
    await $fetch(`/api/admin/service-notes/${noteForm.value.id}`, { method: 'PUT', body: { content: noteForm.value.content } })
  }
  await refresh(); noteEditor.value = false
}

async function deleteNote(n: ServiceNote) {
  if (!confirm('Удалить примечание?')) return
  await $fetch(`/api/admin/service-notes/${n.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <!-- Header -->
  <div class="bg-white border-b border-[#eee] px-4 lg:px-8 py-4 lg:py-5 flex items-center justify-between gap-3 shrink-0">
    <h1 class="text-lg lg:text-xl font-bold text-[#222]">Прайс-лист</h1>
    <button class="bg-brand text-white rounded-xl px-3 lg:px-5 py-2 lg:py-2.5 font-bold text-xs lg:text-sm hover:brightness-110 shadow-[0_3px_0_rgba(9,136,189,0.5)] whitespace-nowrap" @click="openNewCat">
      + Категория
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-3 lg:px-8 py-4 lg:py-6 space-y-4 lg:space-y-5">
    <!-- Categories -->
    <div
      v-for="cat in categories"
      :key="cat.id"
      class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 px-4 lg:px-6 py-3 lg:py-4 bg-[#f8f8f8] border-b border-[#eee]">
        <div class="font-bold text-[#222]">{{ cat.title }}</div>
        <div class="flex gap-2 flex-wrap">
          <button
            v-if="dirtyCategories.has(cat.id)"
            class="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
            @click="saveOrder(cat.id)"
          >
            Сохранить порядок
          </button>
          <button class="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openNewItem(cat.id)">+ Позиция</button>
          <button class="px-3 py-1.5 rounded-lg bg-[#f0f0f0] text-[#555] text-xs font-semibold hover:bg-[#e5e5e5]" @click="openEditCat(cat)">Изменить</button>
          <button class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100" @click="deleteCat(cat)">Удалить</button>
        </div>
      </div>
      <div>
        <div
          v-for="(item, i) in localItems[cat.id] ?? []"
          :key="item.id"
          draggable="true"
          class="flex items-center gap-2 px-4 lg:px-6 py-3 border-b border-[#f5f5f5] last:border-0 transition-colors group"
          :class="[
            dragOverPos?.catId === cat.id && dragOverPos?.index === i ? 'bg-brand/10' : 'hover:bg-[#fafafa]',
            dragging?.catId === cat.id && dragging?.index === i ? 'opacity-40' : '',
          ]"
          @dragstart="onDragStart(cat.id, i, $event)"
          @dragover.prevent="onDragOver(cat.id, i)"
          @drop.prevent="onDrop(cat.id, i)"
          @dragend="onDragEnd"
        >
          <span class="text-[#bbb] cursor-grab active:cursor-grabbing select-none text-base shrink-0" title="Перетащить">⠿</span>
          <span class="text-sm text-[#222] flex-1 min-w-0">{{ item.name }}</span>
          <span class="text-sm font-bold text-brand whitespace-nowrap shrink-0">{{ item.price }}</span>
          <div class="flex gap-1.5 lg:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
            <button class="px-2 lg:px-2.5 py-1 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openEditItem(item)">✏️</button>
            <button class="px-2 lg:px-2.5 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100" @click="deleteItem(item)">×</button>
          </div>
        </div>
        <div v-if="(localItems[cat.id] ?? []).length === 0" class="px-4 lg:px-6 py-4 text-sm text-[#aaa]">Нет позиций</div>
      </div>
    </div>

    <!-- Notes -->
    <div class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
      <div class="flex items-center justify-between px-4 lg:px-6 py-3 lg:py-4 bg-[#f8f8f8] border-b border-[#eee]">
        <div class="font-bold text-[#222]">Примечания</div>
        <button class="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openNewNote">+ Добавить</button>
      </div>
      <div>
        <div
          v-for="note in notes"
          :key="note.id"
          class="flex items-start gap-3 px-4 lg:px-6 py-3 border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors group"
        >
          <span class="text-brand font-bold mt-0.5 shrink-0">!</span>
          <span class="text-sm text-[#444] flex-1 leading-relaxed">{{ note.content }}</span>
          <div class="flex gap-1.5 lg:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0">
            <button class="px-2 lg:px-2.5 py-1 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20" @click="openEditNote(note)">✏️</button>
            <button class="px-2 lg:px-2.5 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100" @click="deleteNote(note)">×</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Category editor -->
  <Teleport to="body">
    <div v-if="catEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" @click.self="catEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ catForm.isNew ? 'Новая категория' : 'Изменить категорию' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="catEditor = false">×</button>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Название</label>
          <input v-model="catForm.title" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" @keydown.enter="saveCat" />
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="catEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveCat">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Item editor -->
  <Teleport to="body">
    <div v-if="itemEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" @click.self="itemEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ itemForm.isNew ? 'Новая позиция' : 'Изменить позицию' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="itemEditor = false">×</button>
        </div>
        <div class="px-6 py-5 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Название услуги</label>
            <input v-model="itemForm.name" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Цена (текст)</label>
            <input v-model="itemForm.price" type="text" placeholder="400 ₽ / от 300 ₽" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="itemEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveItem">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Note editor -->
  <Teleport to="body">
    <div v-if="noteEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" @click.self="noteEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ noteForm.isNew ? 'Новое примечание' : 'Изменить примечание' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="noteEditor = false">×</button>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Текст</label>
          <textarea v-model="noteForm.content" rows="4" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand resize-none" />
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="noteEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveNote">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
