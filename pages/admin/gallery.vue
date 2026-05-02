<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Галерея' })

interface GalleryImage { id: number; sectionId: number; src: string; label: string; sortOrder: number }
interface GallerySection { id: number; title: string; sortOrder: number; images: GalleryImage[] }

const { data: sections, refresh } = await useFetch<GallerySection[]>('/api/gallery')

// ── Section CRUD ──────────────────────────────────────────────────────
const sectionEditor = ref(false)
const sectionForm = ref({ id: 0, title: '', isNew: true })

function openNewSection() {
  sectionForm.value = { id: 0, title: '', isNew: true }
  sectionEditor.value = true
}
function openEditSection(s: GallerySection) {
  sectionForm.value = { id: s.id, title: s.title, isNew: false }
  sectionEditor.value = true
}

async function saveSection() {
  if (!sectionForm.value.title.trim()) return
  if (sectionForm.value.isNew) {
    await $fetch('/api/admin/gallery-sections', { method: 'POST', body: { title: sectionForm.value.title } })
  } else {
    await $fetch(`/api/admin/gallery-sections/${sectionForm.value.id}`, { method: 'PUT', body: { title: sectionForm.value.title } })
  }
  await refresh()
  sectionEditor.value = false
}

async function deleteSection(s: GallerySection) {
  if (!confirm(`Удалить раздел «${s.title}» и все фото в нём?`)) return
  await $fetch(`/api/admin/gallery-sections/${s.id}`, { method: 'DELETE' })
  await refresh()
}

// ── Image CRUD ────────────────────────────────────────────────────────
const imageEditor = ref(false)
const imageForm = ref({ id: 0, sectionId: 0, src: '', label: '', isNew: true })

function openNewImage(sectionId: number) {
  imageForm.value = { id: 0, sectionId, src: '', label: '', isNew: true }
  imageEditor.value = true
}
function openEditImage(img: GalleryImage) {
  imageForm.value = { ...img, isNew: false }
  imageEditor.value = true
}

async function saveImage() {
  if (!imageForm.value.src.trim()) return
  if (imageForm.value.isNew) {
    await $fetch('/api/admin/gallery-images', { method: 'POST', body: imageForm.value })
  } else {
    await $fetch(`/api/admin/gallery-images/${imageForm.value.id}`, { method: 'PUT', body: imageForm.value })
  }
  await refresh()
  imageEditor.value = false
}

async function deleteImage(img: GalleryImage) {
  if (!confirm('Удалить это фото?')) return
  await $fetch(`/api/admin/gallery-images/${img.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <!-- Header -->
  <div class="bg-white border-b border-[#eee] px-8 py-5 flex items-center justify-between shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Галерея</h1>
    <button class="bg-brand text-white rounded-xl px-5 py-2.5 font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)]" @click="openNewSection">
      + Добавить раздел
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
    <div
      v-for="section in sections"
      :key="section.id"
      class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden"
    >
      <!-- Section header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
        <div class="font-bold text-[#222]">{{ section.title }}</div>
        <div class="flex gap-2">
          <button class="px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition-colors" @click="openNewImage(section.id)">+ Фото</button>
          <button class="px-3 py-1.5 rounded-lg bg-[#f0f0f0] text-[#555] text-xs font-semibold hover:bg-[#e5e5e5] transition-colors" @click="openEditSection(section)">Изменить</button>
          <button class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors" @click="deleteSection(section)">Удалить</button>
        </div>
      </div>

      <!-- Images grid -->
      <div class="p-6">
        <div v-if="section.images.length === 0" class="text-sm text-[#aaa] py-6 text-center">Нет фотографий. Нажмите «+ Фото»</div>
        <div v-else class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(120px, 1fr))">
          <div v-for="img in section.images" :key="img.id" class="group relative">
            <div
              class="aspect-square rounded-xl bg-center bg-cover bg-[#eee] cursor-pointer"
              :style="img.src ? `background-image: url('${img.src}')` : ''"
            />
            <div class="text-xs text-[#888] mt-1 truncate">{{ img.label || '—' }}</div>
            <div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="w-6 h-6 bg-white rounded-lg text-[#555] hover:text-brand text-xs flex items-center justify-center shadow" @click="openEditImage(img)">✏️</button>
              <button class="w-6 h-6 bg-white rounded-lg text-red-400 hover:text-red-600 text-xs flex items-center justify-center shadow" @click="deleteImage(img)">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!sections?.length" class="bg-white rounded-2xl p-16 text-center text-[#aaa] shadow-sm border border-[#eee]">
      Разделы галереи не найдены. Создайте первый раздел.
    </div>
  </div>

  <!-- Section editor -->
  <Teleport to="body">
    <div v-if="sectionEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" @click.self="sectionEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ sectionForm.isNew ? 'Новый раздел' : 'Изменить раздел' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="sectionEditor = false">×</button>
        </div>
        <div class="px-6 py-5">
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Название раздела</label>
          <input v-model="sectionForm.title" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" @keydown.enter="saveSection" />
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="sectionEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveSection">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Image editor -->
  <Teleport to="body">
    <div v-if="imageEditor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" @click.self="imageEditor = false">
      <div class="bg-white rounded-2xl w-full max-w-[480px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ imageForm.isNew ? 'Добавить фото' : 'Изменить фото' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="imageEditor = false">×</button>
        </div>
        <div class="px-6 py-5 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">URL фотографии *</label>
            <input v-model="imageForm.src" type="text" placeholder="https://..." class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div v-if="imageForm.src" class="h-[160px] rounded-xl bg-center bg-cover bg-[#eee]" :style="`background-image: url('${imageForm.src}')`" />
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Подпись (необязательно)</label>
            <input v-model="imageForm.label" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="imageEditor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="saveImage">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
