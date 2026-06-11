<script setup lang="ts">
useHead({ title: 'Подтверждение email — Острый край' })

const route = useRoute()
const ok = computed(() => route.query.status === 'ok')
</script>

<template>
  <div class="max-w-[440px] mx-auto px-4 py-10 lg:py-16">
    <div class="bg-white rounded-2xl shadow-sm border border-[#eee] px-5 py-8 lg:px-7 lg:py-10 text-center">
      <template v-if="ok">
        <div class="text-4xl mb-4">✅</div>
        <h1 class="text-xl font-bold text-[#222] mb-2">Email подтверждён</h1>
        <p class="text-sm text-[#666] mb-6">
          Спасибо! Теперь вы можете войти в личный кабинет.
        </p>
        <NuxtLink to="/login" class="inline-block px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] no-underline">
          Войти
        </NuxtLink>
      </template>

      <template v-else>
        <div class="text-4xl mb-4">⚠️</div>
        <h1 class="text-xl font-bold text-[#222] mb-2">Ссылка недействительна</h1>
        <p class="text-sm text-[#666] mb-6">
          Ссылка подтверждения устарела или уже была использована. Войдите и запросите письмо повторно.
        </p>
        <NuxtLink to="/login" class="inline-block px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] no-underline">
          Перейти ко входу
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
