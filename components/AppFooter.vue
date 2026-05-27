<template>
  <footer class="bg-dark text-white font-sans py-8 mt-auto">
    <div class="max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[230px_1fr_1fr] gap-8 lg:gap-10 items-start">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-2.5">
        <img src="/images/logo_footer.png" alt="Острый край" class="w-[120px] h-[120px] object-contain" />
        <span class="text-base text-white text-center">2026 © Заточка Острый Край</span>
      </div>

      <!-- Contacts + socials -->
      <div class="max-w-[400px] flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <a :href="settings?.phone_href || 'tel:+79103043040'" class="flex items-center gap-2.5 text-white no-underline text-lg">
            <img src="/images/phone_icon.png" class="w-5 h-4 object-contain invert" alt="" />
            {{ settings?.phone || '+7 (910) 304-30-40' }}
          </a>
          <a :href="`mailto:${settings?.email || 'zatochka_test@yandex.ru'}`" class="flex items-center gap-2.5 text-white no-underline text-lg">
            <img src="/images/email_icon.png" class="w-5 h-4 object-contain invert" alt="" />
            {{ settings?.email || 'zatochka_test@yandex.ru' }}
          </a>
        </div>
        <div class="flex gap-3 mt-2">
          <a
            v-if="settings?.vk_url"
            :href="settings.vk_url"
            target="_blank"
            rel="noopener"
            title="ВКонтакте"
            class="w-[42px] h-[42px] rounded-xl flex items-center justify-center no-underline transition-opacity hover:opacity-80"
            style="background:#0077FF"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.47h-1.74c-.66 0-.86-.52-2.03-1.71-.96-.96-1.38-.92-1.6-.92-.32 0-.4.08-.4.52v1.56c0 .37-.12.59-1.1.59-1.98 0-3.68-1.03-4.88-3.31C4.87 10.06 4.47 8.1 4.47 7.66c0-.24.08-.46.52-.46h1.74c.38 0 .53.18.67.58.74 2.14 1.97 4.01 2.48 4.01.19 0 .27-.09.27-.58V9.1c-.06-1.04-.61-1.13-.61-1.5 0-.18.14-.37.38-.37h2.74c.32 0 .43.17.43.54v2.9c0 .32.14.43.23.43.19 0 .35-.11.7-.46 1.08-1.21 1.85-3.07 1.85-3.07.1-.24.3-.46.69-.46h1.74c.52 0 .63.27.52.54-.22.96-2.32 3.97-2.32 3.97-.18.3-.25.43 0 .76.18.24.77.74 1.16 1.19.72.81 1.27 1.49 1.42 1.97.15.46-.09.7-.56.7z"/>
            </svg>
          </a>
          <a
            v-if="settings?.yandex_map_url"
            :href="settings.yandex_map_url"
            target="_blank"
            rel="noopener"
            title="Яндекс Карты"
            class="w-[42px] h-[42px] rounded-xl flex items-center justify-center no-underline transition-opacity hover:opacity-80"
            style="background:#FC3F1D"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              <text x="9" y="10" font-size="5.5" font-weight="bold" font-family="Arial" fill="white">Я</text>
            </svg>
          </a>
          <a
            v-if="settings?.dgis_url"
            :href="settings.dgis_url"
            target="_blank"
            rel="noopener"
            title="2ГИС"
            class="w-[42px] h-[42px] rounded-xl overflow-hidden no-underline transition-opacity hover:opacity-80 block"
          >
            <img src="/images/2gis.jpg" alt="2ГИС" class="w-full h-full object-cover" />
          </a>
        </div>
      </div>

      <!-- Schedule + legal -->
      <div class="flex flex-col gap-4">
        <div>
          <div class="text-xl font-medium mb-1.5">График работы</div>
          <div class="text-lg leading-relaxed">ПН-ПТ: 10:00–18:00</div>
          <div class="text-lg leading-relaxed">СБ-ВС: Выходной</div>
        </div>
        <div class="flex flex-col gap-1">
          <NuxtLink to="/offer" class="text-brand text-base no-underline">Публичная оферта</NuxtLink>
          <NuxtLink to="/privacy" class="text-brand text-base no-underline">Политика обработки ПДн</NuxtLink>
          <span class="text-[#aaa] text-sm">
            {{ settings?.legal_name || 'ИП Бельцев В. А.' }}&nbsp;&nbsp;ИНН: {{ settings?.inn || '575207208997' }}
          </span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { data: settings } = await useFetch<Record<string, string>>('/api/settings')
</script>
