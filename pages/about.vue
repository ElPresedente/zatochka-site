<script setup lang="ts">
useHead({ title: 'Острый край — О нас' })

const { data: settings } = await useFetch<Record<string, string>>('/api/settings')

const whoWeAreServices = [
  'Маникюрного инструмента',
  'Педикюрного инструмента',
  'Парикмахерского инструмента',
  'Грумерского инструмента',
  'Садового инструмента',
  'Домашнего инструмента',
]

const repairItems = ['УФ-лампы', 'Машинки для стрижки', 'Другое оборудование']

const shopItems = [
  'Кутикульные и ногтевые кусачки',
  'Различные виды парикмахерских ножниц',
  'Твизеры', 'Пинцеты', 'Пушеры', 'Книпсеры',
  'Наборы инструментов',
  'Маникюрные аппараты', 'Фрезы', 'Пылесосы', 'УФ-лампы',
  'Пилочки одноразовые и многоразовые',
  'Резиновые перчатки', 'Одноразовые маски', 'Многое другое',
]

const advantages = [
  {
    icon: '🎯',
    title: 'Опыт и знания',
    text: 'Наши мастера имеют глубокие знания в области заточки и постоянно совершенствуют свои навыки.',
  },
  {
    icon: '🤝',
    title: 'Индивидуальный подход',
    text: 'Мы учитываем особенности каждого инструмента и потребности наших клиентов.',
  },
  {
    icon: '✨',
    title: 'Дополнительный сервис',
    text: 'У нас в мастерской вы можете выпить чашечку кофе, индивидуализировать свой инструмент при помощи лазерной гравировки, очистить инструмент от налёта, а также многое другое.',
  },
]

const workingHours = [
  ['Понедельник', '10:00–18:00'],
  ['Вторник', '10:00–18:00'],
  ['Среда', '10:00–18:00'],
  ['Четверг', '10:00–18:00'],
  ['Пятница', '10:00–18:00'],
  ['Суббота', 'Выходной'],
  ['Воскресенье', 'Выходной'],
]
</script>

<template>
  <main class="flex-1 max-w-[1100px] mx-auto px-4 lg:px-10 py-10 lg:py-16 w-full">

    <!-- Who we are -->
    <section class="mb-12 lg:mb-[72px]">
      <div class="section-header">
        <span class="section-title">Кто мы</span>
      </div>
      <p class="text-base lg:text-xl leading-relaxed lg:leading-[1.8] text-[#333] mb-5 lg:mb-6">
        Мы — профессиональная заточная мастерская, специализирующаяся на восстановлении остроты и качества различных режущих инструментов.
        Наша команда — это опытные мастера с многолетним стажем, которые знают все тонкости заточки и ухода за инструментами.
      </p>
      <p class="text-base lg:text-xl leading-relaxed lg:leading-[1.8] text-[#333] mb-4 lg:mb-5">Мы предлагаем широкий спектр услуг по заточке:</p>
      <div class="flex flex-col gap-1 pl-1 lg:pl-2">
        <div v-for="item in whoWeAreServices" :key="item" class="flex items-start gap-3 lg:gap-3.5 py-1 lg:py-1.5">
          <div class="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-brand mt-2 shrink-0" />
          <span class="text-base lg:text-xl leading-relaxed">{{ item }}</span>
        </div>
      </div>
      <p class="text-base lg:text-xl leading-relaxed lg:leading-[1.8] text-[#333] my-5 lg:my-6">
        Также мы выполняем ремонтные работы разной сложности техники для салонов красоты, а именно:
      </p>
      <div class="flex flex-col gap-1 pl-1 lg:pl-2">
        <div v-for="item in repairItems" :key="item" class="flex items-start gap-3 lg:gap-3.5 py-1 lg:py-1.5">
          <div class="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-brand mt-2 shrink-0" />
          <span class="text-base lg:text-xl leading-relaxed">{{ item }}</span>
        </div>
      </div>
      <p class="text-base lg:text-xl leading-relaxed lg:leading-[1.8] text-[#333] my-5 lg:my-6">
        В нашей мастерской вы можете приобрести новый инструмент, расходники, технику для работы:
      </p>
      <div class="flex flex-col gap-1 pl-1 lg:pl-2">
        <div v-for="item in shopItems" :key="item" class="flex items-start gap-3 lg:gap-3.5 py-1 lg:py-1.5">
          <div class="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-brand mt-2 shrink-0" />
          <span class="text-base lg:text-xl leading-relaxed">{{ item }}</span>
        </div>
      </div>
    </section>

    <!-- Why choose us -->
    <section class="bg-white rounded-2xl lg:rounded-[20px] px-5 py-8 lg:px-12 lg:py-12 mb-12 lg:mb-[72px] shadow-[0_4px_24px_rgba(0,0,0,0.07)]">
      <div class="section-header">
        <span class="section-title">Почему выбирают нас</span>
      </div>
      <div class="flex flex-col gap-4 lg:gap-5">
        <div
          v-for="adv in advantages"
          :key="adv.title"
          class="flex gap-4 lg:gap-5 items-start px-4 py-4 lg:px-6 lg:py-5 rounded-xl border-2 border-brand/20 bg-brand/[0.03]"
        >
          <div class="text-2xl lg:text-[32px] shrink-0">{{ adv.icon }}</div>
          <div>
            <div class="text-lg lg:text-[22px] font-bold mb-1.5">{{ adv.title }}</div>
            <div class="text-sm lg:text-lg leading-relaxed lg:leading-[1.7] text-[#444]">{{ adv.text }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mission -->
    <section class="mb-12 lg:mb-[72px]">
      <div class="section-header">
        <span class="section-title">Наша миссия</span>
      </div>
      <p class="text-base lg:text-xl leading-relaxed lg:leading-[1.8] text-[#333] text-center max-w-[820px] mx-auto mb-8 lg:mb-10">
        Мы стремимся обеспечить наших клиентов острыми и надёжными инструментами, которые прослужат долгие годы.
        Мы гордимся своей работой и тем, что можем помочь вам сохранить ваши инструменты в идеальном состоянии.
      </p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div
          v-for="src in ['/images/services1.jpg', '/images/services2.jpg', '/images/block1.jpg', '/images/services1.jpg']"
          :key="src + Math.random()"
          class="aspect-[4/3] bg-center bg-cover rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)]"
          :style="`background-image: url('${src}')`"
        />
      </div>
    </section>

    <!-- Contacts -->
    <section class="bg-dark text-white rounded-2xl lg:rounded-[20px] px-5 py-8 lg:px-12 lg:py-12">
      <div class="section-header">
        <span class="section-title text-white">Контакты</span>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        <div class="flex flex-col gap-4 lg:gap-5 text-base lg:text-xl">
          <p>
            Наша мастерская расположена по адресу
            <strong>{{ settings?.address || 'г. Орёл, ул. Полесская д. 2' }}</strong>,
            и мы всегда рады видеть вас в числе наших клиентов.
          </p>
          <div>
            Свяжитесь с нами:<br />
            <a :href="settings?.phone_href || 'tel:+79103043040'" class="text-brand no-underline whitespace-nowrap">{{ settings?.phone || '8 (910) 304-30-40' }}</a><br />
            <a :href="`mailto:${settings?.email || 'zatochka_test@yandex.ru'}`" class="text-brand no-underline break-all">{{ settings?.email || 'zatochka_test@yandex.ru' }}</a>
          </div>
        </div>
        <div>
          <div class="text-lg lg:text-[22px] font-bold mb-3 lg:mb-3.5 text-brand">Режим работы мастерской:</div>
          <div
            v-for="[day, time] in workingHours"
            :key="day"
            class="flex gap-4 lg:gap-6 text-sm lg:text-lg py-[5px] border-b border-white/[0.08]"
          >
            <span class="min-w-[110px] lg:min-w-[140px] text-white/70">{{ day }}</span>
            <span :class="time === 'Выходной' ? 'text-[#777]' : 'text-brand font-semibold'">{{ time }}</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
