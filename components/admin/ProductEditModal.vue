<script setup lang="ts">
import type { ProductDto, ProductSpec } from '~/types/api'

type ProductForm = Partial<ProductDto> & { specs: ProductSpec[]; photos: string[] }

const props = defineProps<{
  product: ProductDto | null
  categoryNames: string[]
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const isNew = computed(() => !props.product)

const form = ref<ProductForm>(initialForm())

function initialForm(): ProductForm {
  if (props.product) {
    return {
      ...props.product,
      specs: props.product.specs.map(s => ({ ...s })),
      photos: [...props.product.photos],
    }
  }
  return {
    name: '', category: props.categoryNames[0] ?? '', price: 0, stock: 0,
    description: '', photos: [], specs: [], active: true, sortOrder: 0,
  }
}

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
    emit('saved')
    emit('close')
  } finally {
    saving.value = false
  }
}

function addSpec() { form.value.specs.push({ key: '', value: '' }) }
function removeSpec(i: number) { form.value.specs.splice(i, 1) }

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
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col shadow-2xl">
        <div class="flex items-center justify-between px-7 py-5 border-b border-[#eee]">
          <div class="text-lg font-bold">{{ isNew ? 'Новый товар' : 'Редактировать товар' }}</div>
          <button class="text-[#aaa] hover:text-[#333] text-2xl" @click="emit('close')">×</button>
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

          <div>
            <label class="block text-xs font-semibold text-[#777] mb-2">Фотографии</label>

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
          <button class="px-6 py-2.5 rounded-xl border-2 border-[#ddd] text-[#555] text-sm font-semibold hover:bg-[#f5f5f5] transition-colors" @click="emit('close')">Отмена</button>
          <button
            class="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold shadow-[0_3px_0_rgba(9,136,189,0.5)] hover:brightness-110 transition-all disabled:opacity-50"
            :disabled="saving"
            @click="save"
          >{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
