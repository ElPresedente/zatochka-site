<script setup lang="ts">
import type { AdminProductCollectionDto, ProductDto } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Подборки товаров' })

const [{ data: collections, refresh }, { data: allProducts }] = await Promise.all([
  useFetch<AdminProductCollectionDto[]>('/api/admin/collections'),
  useFetch<ProductDto[]>('/api/admin/products'),
])

// ── Editor modal ─────────────────────────────────────────────────────────
const editorOpen = ref(false)
const saving = ref(false)
const editorError = ref('')

const form = ref({
  id: 0,
  name: '',
  sortOrder: 0,
  active: true,
  productIds: [] as number[],
  isNew: true,
})

const productSearch = ref('')

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase()
  const list = allProducts.value ?? []
  if (!q) return list
  return list.filter(p => p.name.toLowerCase().includes(q))
})

function openNew() {
  form.value = { id: 0, name: '', sortOrder: maxSortOrder.value + 1, active: true, productIds: [], isNew: true }
  productSearch.value = ''
  editorError.value = ''
  editorOpen.value = true
}

function openEdit(c: AdminProductCollectionDto) {
  form.value = { id: c.id, name: c.name, sortOrder: c.sortOrder, active: c.active, productIds: [...c.productIds], isNew: false }
  productSearch.value = ''
  editorError.value = ''
  editorOpen.value = true
}

function toggleProduct(id: number) {
  const idx = form.value.productIds.indexOf(id)
  if (idx >= 0) form.value.productIds.splice(idx, 1)
  else form.value.productIds.push(id)
}

const maxSortOrder = computed(() => {
  const cols = collections.value ?? []
  return cols.length ? Math.max(...cols.map(c => c.sortOrder)) : 0
})

async function save() {
  editorError.value = ''
  if (!form.value.name.trim()) { editorError.value = 'Введите название'; return }
  saving.value = true
  try {
    if (form.value.isNew) {
      await $fetch('/api/admin/collections', {
        method: 'POST',
        body: { name: form.value.name.trim(), sortOrder: form.value.sortOrder, active: form.value.active, productIds: form.value.productIds },
      })
    } else {
      await $fetch(`/api/admin/collections/${form.value.id}`, {
        method: 'PUT',
        body: { name: form.value.name.trim(), sortOrder: form.value.sortOrder, active: form.value.active, productIds: form.value.productIds },
      })
    }
    await refresh()
    editorOpen.value = false
  } catch (err: any) {
    editorError.value = err?.data?.message ?? 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function toggleActive(c: AdminProductCollectionDto) {
  await $fetch(`/api/admin/collections/${c.id}`, {
    method: 'PUT',
    body: { name: c.name, sortOrder: c.sortOrder, active: !c.active, productIds: c.productIds },
  })
  await refresh()
}

async function deleteCollection(c: AdminProductCollectionDto) {
  if (!confirm(`Удалить подборку «${c.name}»?`)) return
  await $fetch(`/api/admin/collections/${c.id}`, { method: 'DELETE' })
  await refresh()
}

function productName(id: number) {
  return allProducts.value?.find(p => p.id === id)?.name ?? `#${id}`
}

function productPhoto(id: number) {
  const photos = allProducts.value?.find(p => p.id === id)?.photos ?? []
  return photos[0] || '/images/nofoto.jpg'
}
</script>

<template>
  <!-- Header -->
  <div class="bg-white border-b border-[#eee] px-4 lg:px-8 py-3 lg:py-5 flex items-center justify-between shrink-0">
    <h1 class="text-lg lg:text-xl font-bold text-[#222]">Подборки товаров</h1>
    <button
      class="bg-brand text-white rounded-xl px-4 lg:px-5 py-2 lg:py-2.5 font-bold text-xs lg:text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] whitespace-nowrap"
      @click="openNew"
    >+ Подборка</button>
  </div>

  <!-- Hint -->
  <div class="bg-[#f8f9ff] border-b border-[#e8ecff] px-4 lg:px-8 py-2.5 shrink-0">
    <p class="text-xs text-[#666]">
      Подборки отображаются на странице магазина в режиме "Все товары" без поиска и фильтров.
      <strong>Позиция</strong> — после какой строки товаров вставляется подборка (0 = в самом начале, до всех товаров).
      Количество товаров в строке зависит от ширины экрана посетителя.
    </p>
  </div>

  <!-- List -->
  <div class="flex-1 overflow-y-auto px-3 lg:px-8 py-4 lg:py-6">
    <p v-if="(collections ?? []).length === 0" class="text-center text-[#aaa] py-16 text-sm">Подборок пока нет</p>

    <div class="flex flex-col gap-3">
      <div
        v-for="col in (collections ?? [])"
        :key="col.id"
        class="bg-white rounded-xl border border-[#eee] shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3"
      >
        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-sm text-[#222]">{{ col.name }}</span>
            <span
              class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="col.active ? 'bg-green-100 text-green-700' : 'bg-[#f0f0f0] text-[#999]'"
            >{{ col.active ? 'Активна' : 'Скрыта' }}</span>
          </div>
          <div class="mt-1 text-xs text-[#888] flex flex-wrap gap-3">
            <span>Позиция: {{ col.sortOrder }}</span>
            <span>Товаров: {{ col.productIds.length }}</span>
          </div>
          <!-- Thumbnails -->
          <div v-if="col.productIds.length > 0" class="mt-2 flex gap-1 flex-wrap">
            <img
              v-for="pid in col.productIds.slice(0, 8)"
              :key="pid"
              :src="productPhoto(pid)"
              :alt="productName(pid)"
              class="w-8 h-8 rounded object-cover bg-[#eee]"
            />
            <span v-if="col.productIds.length > 8" class="w-8 h-8 rounded bg-[#f0f0f0] flex items-center justify-center text-[10px] text-[#888] font-semibold">+{{ col.productIds.length - 8 }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
            :class="col.active ? 'border-[#e0e0e0] text-[#666] hover:border-red-300 hover:text-red-500' : 'border-green-200 text-green-600 hover:bg-green-50'"
            @click="toggleActive(col)"
          >{{ col.active ? 'Скрыть' : 'Показать' }}</button>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-brand text-brand hover:bg-brand/10 transition-colors"
            @click="openEdit(col)"
          >Изменить</button>
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            @click="deleteCollection(col)"
          >Удалить</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Editor modal -->
  <Teleport to="body">
    <div
      v-if="editorOpen"
      class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      @click.self="editorOpen = false"
    >
      <div class="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90dvh] flex flex-col shadow-2xl">
        <!-- Modal header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-[#eee] shrink-0">
          <h2 class="font-bold text-base text-[#222]">{{ form.isNew ? 'Новая подборка' : 'Редактировать подборку' }}</h2>
          <button class="text-[#aaa] hover:text-[#333] transition-colors p-1" @click="editorOpen = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Modal body -->
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-[#555]">Название подборки</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Например: Новинки, Хит продаж, Рекомендуем"
              maxlength="200"
              class="border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>

          <!-- sortOrder + active row -->
          <div class="flex gap-4 items-end">
            <div class="flex flex-col gap-1.5 flex-1">
              <label class="text-xs font-semibold text-[#555]">Позиция (после N товаров)</label>
              <input
                v-model.number="form.sortOrder"
                type="number"
                min="0"
                max="100000"
                class="border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
              />
              <p class="text-[11px] text-[#aaa]">0 — в начале страницы, 1 — после первой строки товаров, 2 — после второй и т.д.</p>
            </div>
            <label class="flex items-center gap-2 cursor-pointer pb-6 shrink-0">
              <input v-model="form.active" type="checkbox" class="w-4 h-4 accent-brand" />
              <span class="text-sm font-semibold text-[#444]">Активна</span>
            </label>
          </div>

          <!-- Product selector -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-[#555]">Товары в подборке</label>
              <span class="text-xs text-[#aaa]">Выбрано: {{ form.productIds.length }}</span>
            </div>
            <input
              v-model="productSearch"
              type="text"
              placeholder="Поиск товара..."
              class="border border-[#ddd] rounded-xl px-4 py-2 text-sm outline-none focus:border-brand transition-colors"
            />

            <!-- Selected order preview -->
            <div v-if="form.productIds.length > 0" class="flex gap-1.5 flex-wrap p-3 bg-[#f8f9fa] rounded-xl">
              <div
                v-for="pid in form.productIds"
                :key="pid"
                class="flex items-center gap-1.5 bg-white border border-[#e0e0e0] rounded-lg px-2 py-1"
              >
                <img :src="productPhoto(pid)" class="w-5 h-5 rounded object-cover bg-[#eee]" />
                <span class="text-xs text-[#333] max-w-[100px] truncate">{{ productName(pid) }}</span>
                <button class="text-[#bbb] hover:text-red-500 transition-colors ml-0.5" @click="toggleProduct(pid)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Product list -->
            <div class="border border-[#eee] rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
              <label
                v-for="product in filteredProducts"
                :key="product.id"
                class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#f5f5f5] transition-colors border-b last:border-0 border-[#f0f0f0]"
              >
                <input
                  type="checkbox"
                  :checked="form.productIds.includes(product.id)"
                  class="w-4 h-4 accent-brand shrink-0"
                  @change="toggleProduct(product.id)"
                />
                <img :src="product.photos[0] || '/images/nofoto.jpg'" class="w-8 h-8 rounded object-cover bg-[#eee] shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold text-[#222] truncate">{{ product.name }}</div>
                  <div class="text-[11px] text-[#888]">{{ product.category }} · {{ product.price }} ₽</div>
                </div>
                <span
                  v-if="!product.active"
                  class="text-[10px] font-semibold px-1.5 py-0.5 bg-[#f0f0f0] text-[#aaa] rounded shrink-0"
                >скрыт</span>
              </label>
              <div v-if="filteredProducts.length === 0" class="px-4 py-6 text-center text-xs text-[#aaa]">Ничего не найдено</div>
            </div>
          </div>

          <p v-if="editorError" class="text-sm text-red-500 font-semibold">{{ editorError }}</p>
        </div>

        <!-- Modal footer -->
        <div class="flex gap-3 px-5 py-4 border-t border-[#eee] shrink-0">
          <button
            class="flex-1 bg-brand text-white rounded-xl py-2.5 font-bold text-sm hover:brightness-110 transition-all disabled:opacity-50 shadow-[0_3px_0_rgba(9,136,189,0.5)]"
            :disabled="saving"
            @click="save"
          >{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
          <button
            class="px-5 py-2.5 rounded-xl border border-[#ddd] text-sm font-semibold text-[#555] hover:bg-[#f5f5f5] transition-colors"
            @click="editorOpen = false"
          >Отмена</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
