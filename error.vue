<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error.statusCode === 404)

useHead({ title: is404.value ? 'Страница не найдена — Острый край' : 'Ошибка — Острый край' })

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <AppHeader />

    <main class="flex-1 flex items-center justify-center px-4 py-16">
      <div class="text-center max-w-md">
        <div class="text-[96px] font-bold text-brand leading-none mb-4">
          {{ error.statusCode }}
        </div>

        <h1 class="text-2xl font-bold text-dark mb-3">
          {{ is404 ? 'Страница не найдена' : 'Что-то пошло не так' }}
        </h1>

        <p class="text-[#666] mb-8 leading-relaxed">
          {{ is404
            ? 'Возможно, страница была удалена или вы перешли по неверной ссылке.'
            : 'Произошла внутренняя ошибка. Попробуйте вернуться на главную страницу.' }}
        </p>

        <button class="btn-primary" @click="handleError">
          На главную
        </button>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
