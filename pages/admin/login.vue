<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Вход — Острый край' })

const { login } = useAuth()
const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(phone.value, password.value)
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Неверный телефон или пароль'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[rgb(36,35,35)] flex items-center justify-center font-[Inter,sans-serif] p-4">
    <div class="w-full max-w-[380px]">
      <div class="text-center mb-8">
        <div class="text-white font-bold text-2xl leading-snug">
          Острый край
        </div>
        <div class="text-brand text-sm mt-1">Панель управления</div>
      </div>

      <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-6 lg:px-8 py-5 lg:py-6 border-b border-[#eee]">
          <div class="font-bold text-[#222] text-lg">Вход</div>
        </div>
        <form class="px-6 lg:px-8 py-5 lg:py-6 flex flex-col gap-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Телефон</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="+7 (910) 304-30-40"
              autocomplete="username"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Пароль</label>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>

          <Transition name="fade">
            <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
              {{ error }}
            </div>
          </Transition>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-brand text-white rounded-xl py-3 font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] disabled:opacity-60 mt-1"
          >
            {{ loading ? 'Вход...' : 'Войти' }}
          </button>
        </form>
      </div>

      <div class="text-center mt-6">
        <NuxtLink to="/" class="text-white/40 text-xs hover:text-white/70 no-underline transition-colors">
          ← На сайт
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
