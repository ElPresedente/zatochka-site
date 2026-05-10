<script setup lang="ts">
useHead({ title: 'Вход — Острый край' })

const route = useRoute()
const { user, login, fetchUser } = useAuth()

const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

await fetchUser()

if (user.value) {
  await navigateTo(typeof route.query.next === 'string' ? route.query.next : '/shop')
}

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await login(phone.value, password.value)
    await navigateTo(typeof route.query.next === 'string' ? route.query.next : '/shop')
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Неверный телефон или пароль'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-[440px] mx-auto px-4 py-10 lg:py-16">
    <h1 class="text-2xl font-bold text-[#222] mb-6 lg:mb-8">Вход</h1>

    <form class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden" @submit.prevent="submit">
      <div class="px-5 py-5 lg:px-7 lg:py-6 flex flex-col gap-4 lg:gap-5">
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
      </div>

      <div class="px-5 py-4 lg:px-7 lg:py-5 border-t border-[#eee] flex items-center justify-between gap-3">
        <NuxtLink to="/register" class="text-sm text-[#999] no-underline hover:text-[#555] transition-colors">
          Создать аккаунт
        </NuxtLink>
        <button
          type="submit"
          :disabled="loading || !phone.trim() || !password"
          class="px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {{ loading ? 'Вход...' : 'Войти' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
