<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Настройки' })

const { data: settings, refresh } = await useFetch<Record<string, string>>('/api/settings')

const defaultMapEmbedUrl = 'https://yandex.ru/map-widget/v1/org/ostry_kray/96290816208/?from=mapframe&ll=36.059318%2C52.970957&utm_source=share&z=19'
const defaultYandexMapUrl = 'https://yandex.ru/maps/org/ostry_kray/96290816208/'
const defaultYandexReviewsWidgetUrl = 'https://yandex.ru/maps-reviews-widget/96290816208?comments'

const form = ref({
  phone: '',
  phone_href: '',
  email: '',
  address: '',
  map_embed_url: '',
  yandex_map_url: '',
  yandex_reviews_widget_url: '',
  vk_url: '',
  dgis_url: '',
  legal_name: '',
  inn: '',
})

watch(settings, (s) => {
  if (!s) return
  form.value.phone = s.phone ?? ''
  form.value.phone_href = s.phone_href ?? ''
  form.value.email = s.email ?? ''
  form.value.address = s.address ?? ''
  form.value.map_embed_url = s.map_embed_url ?? defaultMapEmbedUrl
  form.value.yandex_map_url = s.yandex_map_url ?? defaultYandexMapUrl
  form.value.yandex_reviews_widget_url = s.yandex_reviews_widget_url ?? defaultYandexReviewsWidgetUrl
  form.value.vk_url = s.vk_url ?? ''
  form.value.dgis_url = s.dgis_url ?? ''
  form.value.legal_name = s.legal_name ?? ''
  form.value.inn = s.inn ?? ''
}, { immediate: true })

const saving = ref(false)
const saved = ref(false)

async function save() {
  saving.value = true
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: form.value })
    await refresh()
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-4 lg:px-8 py-4 lg:py-5 shrink-0">
    <h1 class="text-lg lg:text-xl font-bold text-[#222]">Настройки сайта</h1>
  </div>

  <div class="flex-1 overflow-y-auto px-3 lg:px-8 py-4 lg:py-6">
    <div class="bg-white rounded-2xl shadow-sm border border-[#eee] max-w-[600px]">
      <div class="px-5 lg:px-7 py-4 lg:py-6 border-b border-[#eee] font-semibold text-[#555]">Контактная информация</div>
      <div class="px-5 lg:px-7 py-5 lg:py-6 flex flex-col gap-4 lg:gap-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Телефон (отображение)</label>
            <input v-model="form.phone" type="text" placeholder="+7 (910) 304-30-40" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Телефон (ссылка tel:)</label>
            <input v-model="form.phone_href" type="text" placeholder="tel:+79103043040" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Email</label>
          <input v-model="form.email" type="email" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Адрес</label>
          <input v-model="form.address" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">URL карты (Яндекс embed)</label>
          <input v-model="form.map_embed_url" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">URL организации на Яндекс Картах</label>
          <input v-model="form.yandex_map_url" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">URL виджета отзывов Яндекс</label>
          <input v-model="form.yandex_reviews_widget_url" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Ссылка ВКонтакте (футер)</label>
          <input v-model="form.vk_url" type="url" placeholder="https://vk.com/..." class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Ссылка 2ГИС (футер)</label>
          <input v-model="form.dgis_url" type="url" placeholder="https://2gis.ru/..." class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Юридическое лицо</label>
            <input v-model="form.legal_name" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">ИНН</label>
            <input v-model="form.inn" type="text" class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand" />
          </div>
        </div>

        <div class="flex items-center gap-4 pt-2">
          <button
            class="px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] disabled:opacity-60"
            :disabled="saving"
            @click="save"
          >{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
          <Transition name="fade">
            <span v-if="saved" class="text-sm text-green-600 font-semibold">Сохранено</span>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
