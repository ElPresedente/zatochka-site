<script setup lang="ts">
useHead({ title: 'Острый край — Заточка инструмента' })

const { data: workers } = await useFetch('/api/workers')
const { data: settings } = await useFetch<Record<string, string>>('/api/settings')

const defaultMapEmbedUrl = 'https://yandex.ru/map-widget/v1/org/ostry_kray/96290816208/?from=mapframe&ll=36.059318%2C52.970957&utm_source=share&z=19'
const defaultYandexMapUrl = 'https://yandex.ru/maps/org/ostry_kray/96290816208/'
const defaultYandexReviewsWidgetUrl = 'https://yandex.ru/maps-reviews-widget/96290816208?comments'

const bannerStats = [
  { value: '10', label: 'Более десяти\nлет на рынке', raised: true },
  { value: '10', label: 'Десятки тысяч\nдовольных клиентов', raised: false },
  { value: '100', label: 'Сотни тысяч\nзаточенных инструментов', raised: true },
]

const serviceList = [
  'Заточка маникюрного инструмента',
  'Заточка педикюрного инструмента',
  'Заточка парикмахерского инструмента',
  'Заточка грумерского инструмента',
  'Заточка домашнего и садового инструмента',
  'Ремонт маникюрных аппаратов',
  'Ремонт техники для салонов красоты',
]

const serviceCards = [
  {
    title: 'Заточка маникюрного инструмента',
    text: 'Взгляните на прайс-лист предоставляемых услуг по заточке маникюрного инструмента и выберете подходящий вам тариф.',
    img: '/images/block1.jpg',
  },
  {
    title: 'Ремонт маникюрных аппаратов',
    text: 'Диагностика, чистка и ремонт маникюрных аппаратов. Гарантия на работу до 3-х месяцев. Скидки на последующий ремонт!',
    img: '/images/services1.jpg',
  },
  {
    title: 'Домашний и садовый инструмент',
    text: 'Заточка домашних, садовых и портных ножниц, топоров, лопат, пил и др. Взгляните на полный прайс-лист.',
    img: '/images/services2.jpg',
  },
]

const workingHours = [
  ['Понедельник:', '10:00 – 18:00'],
  ['Вторник:', '10:00 – 18:00'],
  ['Среда:', '10:00 – 18:00'],
  ['Четверг:', '10:00 – 18:00'],
  ['Пятница:', '10:00 – 18:00'],
  ['Суббота:', 'Выходной'],
  ['Воскресенье:', 'Выходной'],
]
</script>

<template>
  <!-- Banner -->
  <section class="relative h-[520px] overflow-hidden">
    <div class="absolute inset-0 bg-[url('/images/banner.png')] bg-center bg-cover" />
    <div
      class="absolute inset-0 flex items-stretch"
      style="background: linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 52%, rgba(0,0,0,0.60) 100%)"
    >
      <!-- Left: text content -->
      <div class="flex flex-col justify-center pl-20 pr-5">
        <h1 class="text-white text-[60px] font-bold leading-[1.15] max-w-[640px] mb-5">
          Профессиональная заточка инструмента
        </h1>
        <p class="text-white/90 text-[22px] max-w-[520px] mb-8 leading-relaxed">
          Маникюрный, парикмахерский, грумерский и домашний инструмент
        </p>
        <div class="flex gap-4">
          <NuxtLink to="/services" class="btn-primary text-[22px]">Услуги и цены</NuxtLink>
          <NuxtLink
            to="/about"
            class="inline-block bg-white/15 text-white border-2 border-white/60 rounded-2xl px-9 py-3.5 font-bold text-[22px] no-underline backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            О нас
          </NuxtLink>
        </div>
      </div>

      <!-- Right: logo + stats -->
      <div class="flex-1 flex flex-col items-center justify-center gap-2 px-6">
        <img
          src="/images/logo_footer.png"
          alt="Острый край"
          class="w-[300px] h-[300px] object-contain"
        />
        <div class="flex items-end gap-8">
          <div
            v-for="stat in bannerStats"
            :key="stat.label"
            class="flex flex-col items-center text-center gap-1"
            :class="stat.raised ? 'mb-9' : 'mb-0'"
          >
            <div class="relative flex items-center justify-center w-[120px] h-[88px]">
              <img src="/images/gold.png" alt="" class="absolute inset-0 w-full h-full object-contain" />
              <span class="relative z-10 text-[34px] font-bold leading-none -mt-2" style="color: #D4AF37; text-shadow: 0 1px 6px rgba(0,0,0,0.5)">{{ stat.value }}</span>
            </div>
            <span class="text-[12px] leading-snug whitespace-pre-line font-medium" style="color: #D4AF37">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- What we offer -->
  <section class="py-[72px] px-20 max-w-[1440px] mx-auto w-full">
    <div class="section-header">
      <span class="section-title">Что мы предлагаем?</span>
    </div>
    <div class="flex gap-10 items-stretch">
      <!-- List -->
      <div class="flex-1 flex flex-col">
        <div
          v-for="item in serviceList"
          :key="item"
          class="flex items-start gap-3 py-2.5 border-b border-black/[0.08]"
        >
          <div class="w-2.5 h-2.5 rounded-full bg-brand mt-[7px] shrink-0" />
          <span class="text-xl leading-relaxed text-[#222]">{{ item }}</span>
        </div>
        <div class="mt-8">
          <NuxtLink to="/services" class="btn-primary">Узнать больше</NuxtLink>
        </div>
      </div>
      <!-- Photos -->
      <div class="flex-1 flex flex-col gap-5">
        <div class="flex-1 min-h-[220px] bg-[url('/images/services1.jpg')] bg-center bg-cover rounded-xl" />
        <div class="flex-1 min-h-[220px] bg-[url('/images/services2.jpg')] bg-center bg-cover rounded-xl" />
      </div>
    </div>
  </section>

  <!-- Try now -->
  <section class="py-[72px] bg-white w-full">
    <div class="max-w-[1440px] mx-auto px-20">
      <div class="section-header">
        <span class="section-title">Попробуйте уже сейчас!</span>
      </div>
      <div class="flex gap-7">
        <div
          v-for="card in serviceCards"
          :key="card.title"
          class="rounded-2xl overflow-hidden bg-dark flex flex-col flex-1 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        >
          <div
            class="h-[200px] bg-center bg-cover"
            :style="`background-image: url('${card.img}')`"
          />
          <div class="p-6 flex flex-col gap-3 flex-1">
            <div class="text-[26px] font-semibold text-white leading-snug">{{ card.title }}</div>
            <div class="text-base text-white/80 leading-relaxed flex-1">{{ card.text }}</div>
            <NuxtLink to="/services" class="btn-primary text-lg py-3 px-6">Подробнее</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Workers -->
  <section class="py-[72px] px-20 max-w-[1440px] mx-auto w-full">
    <div class="section-header">
      <span class="section-title">Наши работники</span>
    </div>
    <div class="flex gap-20 justify-center">
      <div
        v-for="worker in workers"
        :key="worker.id"
        class="flex flex-col items-center gap-3 flex-1 max-w-[360px]"
      >
        <div
          class="w-full aspect-[5/6] bg-center bg-cover rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
          :style="`background-image: url('${worker.photo}')`"
        />
        <div class="text-center">
          <div class="text-[40px] font-bold">{{ worker.name }}</div>
          <div class="text-xl text-[#555] mt-1">{{ worker.role }}</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Reviews -->
  <section class="py-[72px] bg-white w-full">
    <div class="max-w-[1440px] mx-auto px-20">
      <div class="section-header">
        <span class="section-title">Отзывы о нас</span>
      </div>
      <div class="flex justify-center">
        <div class="relative w-full max-w-[760px] h-[720px] max-h-[80vh] min-h-[560px] overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]">
          <iframe
            :src="settings?.yandex_reviews_widget_url || defaultYandexReviewsWidgetUrl"
            title="Отзывы Яндекс Карт"
            loading="lazy"
            class="block h-full w-full border-0"
          />
          <a
            :href="settings?.yandex_map_url || defaultYandexMapUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="absolute bottom-2 left-4 right-4 block overflow-hidden text-ellipsis whitespace-nowrap text-center font-sans text-[10px] leading-[14px] text-[#b3b3b3] no-underline"
          >
            Острый край на карте Орла - Яндекс Карты
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- How to find us -->
  <section class="py-[72px] px-20 max-w-[1440px] mx-auto w-full">
    <div class="section-header">
      <span class="section-title">Как нас найти</span>
    </div>
    <div class="flex gap-[60px] items-start">
      <div class="flex-1 flex flex-col gap-7">
        <div class="text-[32px] font-bold text-center leading-snug">
          Мы не прячемся!<br />Найдите нас по адресу:
        </div>
        <div class="flex items-center gap-4">
          <img src="/images/map_pin.png" class="w-[52px] h-[52px] object-contain" alt="" />
          <span class="text-[28px] leading-snug">г. Орёл, ул. Полесская д. 2</span>
        </div>
        <div class="flex items-start gap-4">
          <img src="/images/clock_icon.png" class="w-[52px] h-16 object-contain mt-1" alt="" />
          <div>
            <div class="text-2xl font-bold mb-2">Режим работы:</div>
            <div
              v-for="[day, time] in workingHours"
              :key="day"
              class="flex gap-4 text-xl leading-[1.8]"
            >
              <span class="min-w-[150px] text-[#555]">{{ day }}</span>
              <span
                :class="time === 'Выходной' ? 'text-[#999]' : 'font-semibold text-[#111]'"
              >{{ time }}</span>
            </div>
          </div>
        </div>
        <div class="text-xl leading-relaxed text-[#444]">
          Свяжитесь с нами по телефону
          <a href="tel:+79103043040" class="text-brand no-underline font-semibold">8 (910) 304-30-40</a>
          или напишите на
          <a href="mailto:zatochka_test@yandex.ru" class="text-brand no-underline font-semibold">zatochka_test@yandex.ru</a>
        </div>
      </div>

      <!-- Map -->
      <div class="flex-[1.2] min-h-[400px] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.12)] bg-[rgb(232,232,232)]">
        <iframe
          :src="settings?.map_embed_url || defaultMapEmbedUrl"
          width="100%"
          height="420"
          frameborder="0"
          allowfullscreen
          class="block border-0"
        />
      </div>
    </div>
  </section>
</template>
