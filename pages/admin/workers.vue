<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Работники' })

interface Worker { id: number; name: string; role: string; photo: string; sortOrder: number }

const { data: workers, refresh } = await useFetch<Worker[]>('/api/workers')

const editor = ref(false)
const form = ref({ id: 0, name: '', role: '', photo: '', isNew: true })

function openNew() {
  form.value = { id: 0, name: '', role: '', photo: '', isNew: true }
  editor.value = true
}
function openEdit(w: Worker) {
  form.value = { ...w, isNew: false }
  editor.value = true
}

async function save() {
  if (!form.value.name.trim()) return
  if (form.value.isNew) {
    await $fetch('/api/admin/workers', { method: 'POST', body: form.value })
  } else {
    await $fetch(`/api/admin/workers/${form.value.id}`, { method: 'PUT', body: form.value })
  }
  await refresh()
  editor.value = false
}

async function deleteWorker(w: Worker) {
  if (!confirm(`Удалить «${w.name}»?`)) return
  await $fetch(`/api/admin/workers/${w.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-4 lg:px-8 py-4 lg:py-5 flex items-center justify-between gap-3 shrink-0">
    <h1 class="text-lg lg:text-xl font-bold text-[#222]">Работники</h1>
    <button class="bg-brand text-white rounded-xl px-3 lg:px-5 py-2 lg:py-2.5 font-bold text-xs lg:text-sm hover:brightness-110 shadow-[0_3px_0_rgba(9,136,189,0.5)] whitespace-nowrap" @click="openNew">
      + Добавить
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-3 lg:px-8 py-4 lg:py-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
      <div
        v-for="w in workers"
        :key="w.id"
        class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden"
      >
        <div
          class="h-[200px] lg:h-[220px] bg-center bg-cover bg-[#eee]"
          :style="w.photo ? `background-image: url('${w.photo}')` : ''"
        />
        <div class="p-4 lg:p-5">
          <div class="font-bold text-lg lg:text-xl text-[#222] mb-0.5">{{ w.name }}</div>
          <div class="text-sm text-[#888]">{{ w.role }}</div>
          <div class="flex gap-2 mt-3 lg:mt-4">
            <button class="flex-1 px-3 py-2 rounded-xl bg-brand/10 text-brand text-sm font-semibold hover:bg-brand/20 transition-colors" @click="openEdit(w)">Изменить</button>
            <button class="flex-1 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors" @click="deleteWorker(w)">Удалить</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!workers?.length" class="bg-white rounded-2xl p-12 lg:p-16 text-center text-[#aaa] shadow-sm border border-[#eee] mt-0">
      Нет работников
    </div>
  </div>

  <Teleport to="body">
    <div v-if="editor" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 overflow-y-auto" @click.self="editor = false">
      <div class="bg-white rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-5 border-b border-[#eee]">
          <div class="font-bold">{{ form.isNew ? 'Новый работник' : 'Изменить работника' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="editor = false">×</button>
        </div>
        <div class="px-6 py-5 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Имя</label>
            <input v-model="form.name" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Должность / роль</label>
            <input v-model="form.role" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">URL фото</label>
            <input v-model="form.photo" type="text" placeholder="/images/... или https://..." class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div v-if="form.photo" class="h-[140px] rounded-xl bg-center bg-cover bg-[#eee]" :style="`background-image: url('${form.photo}')`" />
        </div>
        <div class="px-6 py-4 border-t border-[#eee] flex justify-end gap-3">
          <button class="px-5 py-2 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5]" @click="editor = false">Отмена</button>
          <button class="px-5 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:brightness-110" @click="save">Сохранить</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
