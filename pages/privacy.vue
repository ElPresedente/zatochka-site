<script setup lang="ts">
useHead({ title: 'Политика обработки персональных данных — Острый край' })

const { data: settings } = await useFetch<Record<string, string>>('/api/settings')
</script>

<template>
  <div class="max-w-[800px] mx-auto px-4 lg:px-6 py-10 lg:py-14">
    <h1 class="text-2xl lg:text-3xl font-bold text-[#222] mb-2">
      Политика обработки персональных данных
    </h1>
    <p class="text-[#888] text-sm mb-8 lg:mb-10">Редакция 1.0 &nbsp;·&nbsp; Вступает в силу с момента публикации</p>

    <div class="prose prose-sm max-w-none text-[#333] leading-relaxed flex flex-col gap-8">

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">1. Оператор персональных данных</h2>
        <p>
          Оператором персональных данных является
          <strong>{{ settings?.legal_name || 'ИП Бельцев В. А.' }}</strong>,
          ИНН {{ settings?.inn || '575207208997' }},
          адрес: {{ settings?.address || 'г. Орёл' }}.
        </p>
        <p class="mt-2">
          Контактный адрес для обращений по вопросам обработки персональных данных:
          <a :href="`mailto:${settings?.email || 'info@example.ru'}`" class="text-brand no-underline hover:underline">
            {{ settings?.email || 'info@example.ru' }}
          </a>
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">2. Перечень обрабатываемых данных</h2>
        <p>При регистрации на сайте оператор собирает следующие персональные данные:</p>
        <ul class="list-disc pl-6 mt-2 flex flex-col gap-1">
          <li>фамилия;</li>
          <li>имя;</li>
          <li>номер мобильного телефона.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">3. Цели обработки</h2>
        <ul class="list-disc pl-6 flex flex-col gap-1">
          <li>идентификация пользователя при входе в личный кабинет;</li>
          <li>связь с клиентом по вопросам заказов и оказания услуг;</li>
          <li>исполнение договора между оператором и субъектом персональных данных.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">4. Правовое основание</h2>
        <p>
          Обработка персональных данных осуществляется на основании:
        </p>
        <ul class="list-disc pl-6 mt-2 flex flex-col gap-1">
          <li>согласия субъекта персональных данных (ст. 6 ч. 1 п. 1 Федерального закона № 152-ФЗ);</li>
          <li>необходимости исполнения договора, стороной которого является субъект (ст. 6 ч. 1 п. 5 Федерального закона № 152-ФЗ).</li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">5. Способы и условия обработки</h2>
        <p>
          Персональные данные хранятся в защищённой базе данных на сервере оператора.
          Передача третьим лицам не осуществляется, за исключением случаев, прямо предусмотренных действующим законодательством.
        </p>
        <p class="mt-2">
          Пароли хранятся исключительно в виде необратимого криптографического хэша.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">6. Срок хранения</h2>
        <p>
          Персональные данные хранятся до момента отзыва согласия субъектом или до достижения целей обработки, но не более 3 (трёх) лет с момента последнего взаимодействия с оператором.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">7. Права субъекта персональных данных</h2>
        <p>Субъект персональных данных имеет право:</p>
        <ul class="list-disc pl-6 mt-2 flex flex-col gap-1">
          <li>получить подтверждение факта обработки и доступ к своим данным;</li>
          <li>потребовать уточнения, блокирования или уничтожения неточных данных;</li>
          <li>отозвать ранее данное согласие на обработку;</li>
          <li>обжаловать действия оператора в Роскомнадзоре.</li>
        </ul>
        <p class="mt-3">
          Для реализации прав направьте обращение на адрес:
          <a :href="`mailto:${settings?.email || 'info@example.ru'}`" class="text-brand no-underline hover:underline">
            {{ settings?.email || 'info@example.ru' }}
          </a>
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[#222] mb-3">8. Согласие и его доказательство</h2>
        <p>
          Факт согласия субъекта фиксируется в момент регистрации: сохраняются дата и время получения согласия, а также версия настоящей Политики, действовавшей на тот момент.
          Оператор несёт обязанность доказать наличие согласия (ч. 3 ст. 9 Федерального закона № 152-ФЗ).
        </p>
      </section>

    </div>
  </div>
</template>
