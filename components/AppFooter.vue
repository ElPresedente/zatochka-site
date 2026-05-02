<template>
  <footer class="bg-dark text-white font-sans py-8 mt-auto">
    <div class="max-w-[1440px] mx-auto px-12 grid grid-cols-[200px_1fr_1fr] gap-10 items-start">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-2.5">
        <img src="/images/logo_footer.png" alt="Острый край" class="w-[120px] h-[120px] object-contain" />
        <span class="text-base text-white text-center">2024 © Заточка Орёл</span>
      </div>

      <!-- Contacts + socials -->
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-2">
          <a href="tel:+79103043040" class="flex items-center gap-2.5 text-white no-underline text-lg">
            <img src="/images/phone_icon.png" class="w-5 h-4 object-contain invert" alt="" />
            +7 (910) 304-30-40
          </a>
          <a href="mailto:zatochka_test@yandex.ru" class="flex items-center gap-2.5 text-white no-underline text-lg">
            <img src="/images/email_icon.png" class="w-5 h-4 object-contain invert" alt="" />
            zatochka_test@yandex.ru
          </a>
        </div>
        <div class="flex gap-3.5 mt-2">
          <a
            v-for="s in socials"
            :key="s.label"
            :href="s.href"
            class="w-[42px] h-[42px] rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white cursor-pointer no-underline"
          >
            {{ s.label }}
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
          <a href="#" class="text-brand text-base no-underline">Публичная оферта</a>
          <span class="text-[#aaa] text-sm">ИП Бельцев В. А.&nbsp;&nbsp;ИНН: 575207208997</span>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const socials = [
  { label: 'VK', href: '#' },
  { label: 'TG', href: '#' },
  { label: 'WA', href: '#' },
]
</script>
