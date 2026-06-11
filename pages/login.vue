<script setup lang="ts">
useHead({ title: 'Вход — Острый край' })

const route = useRoute()
const { user, login: authLogin, fetchUser } = useAuth()

const loginInput = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const needsVerify = ref(false)
const verifyEmail = ref('')
const resendState = ref<'idle' | 'sending' | 'sent'>('idle')

await fetchUser()

if (user.value) {
  await navigateTo(typeof route.query.next === 'string' ? route.query.next : '/shop')
}

async function submit() {
  error.value = ''
  needsVerify.value = false
  resendState.value = 'idle'
  loading.value = true

  try {
    await authLogin(loginInput.value, password.value)
    await navigateTo(typeof route.query.next === 'string' ? route.query.next : '/shop')
  } catch (e: any) {
    if (e?.data?.data?.code === 'email_not_verified') {
      needsVerify.value = true
      verifyEmail.value = e?.data?.data?.email ?? ''
      error.value = e?.data?.message ?? 'Подтвердите email, чтобы войти.'
    } else {
      error.value = e?.data?.message ?? 'Неверный телефон или пароль'
    }
  } finally {
    loading.value = false
  }
}

async function resendVerification() {
  if (resendState.value === 'sending' || !verifyEmail.value) return
  resendState.value = 'sending'
  try {
    await $fetch('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: verifyEmail.value },
    })
    resendState.value = 'sent'
  } catch {
    resendState.value = 'idle'
  }
}
</script>

<template>
  <div class="max-w-[440px] mx-auto px-4 py-10 lg:py-16">
    <h1 class="text-2xl font-bold text-[#222] mb-6 lg:mb-8">Вход</h1>

    <form class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden" @submit.prevent="submit">
      <div class="px-5 py-5 lg:px-7 lg:py-6 flex flex-col gap-4 lg:gap-5">
        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Телефон или Email</label>
          <input
            v-model="loginInput"
            type="text"
            placeholder="+7 (910) 304-30-40 или you@example.com"
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
          <div v-if="error" class="text-sm rounded-xl px-4 py-2.5" :class="needsVerify ? 'text-amber-700 bg-amber-50' : 'text-red-500 bg-red-50'">
            {{ error }}
            <div v-if="needsVerify" class="mt-2">
              <button
                v-if="resendState !== 'sent'"
                type="button"
                :disabled="resendState === 'sending'"
                class="font-semibold underline hover:no-underline disabled:opacity-50"
                @click="resendVerification"
              >
                {{ resendState === 'sending' ? 'Отправка...' : 'Отправить письмо повторно' }}
              </button>
              <span v-else class="text-green-600 font-semibold">Письмо отправлено</span>
            </div>
          </div>
        </Transition>
      </div>

      <div class="px-5 py-4 lg:px-7 lg:py-5 border-t border-[#eee] flex items-center justify-between gap-3">
        <div class="flex flex-col gap-1">
          <NuxtLink to="/register" class="text-sm text-[#999] no-underline hover:text-[#555] transition-colors">
            Создать аккаунт
          </NuxtLink>
          <NuxtLink to="/forgot-password" class="text-xs text-[#bbb] no-underline hover:text-[#888] transition-colors">
            Забыли пароль?
          </NuxtLink>
        </div>
        <button
          type="submit"
          :disabled="loading || !loginInput.trim() || !password"
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
