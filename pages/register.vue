<script setup lang="ts">
useHead({ title: 'Регистрация — Острый край' })

const form = ref({
  lastName: '',
  firstName: '',
  phone: '',
  email: '',
  password: '',
  passwordConfirm: '',
  termsAccepted: false,
  consentGiven: false,
})
const error = ref('')
const loading = ref(false)
const success = ref(false)
const { fetchUser } = useAuth()

async function submit() {
  error.value = ''

  if (form.value.password !== form.value.passwordConfirm) {
    error.value = 'Пароли не совпадают'
    return
  }
  if (!form.value.termsAccepted) {
    error.value = 'Необходимо принять условия Пользовательского соглашения'
    return
  }
  if (!form.value.consentGiven) {
    error.value = 'Необходимо дать согласие на обработку персональных данных'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        lastName: form.value.lastName,
        firstName: form.value.firstName,
        phone: form.value.phone,
        email: form.value.email,
        password: form.value.password,
        consentGiven: form.value.consentGiven,
      },
    })
    await fetchUser(true)
    success.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Ошибка регистрации'
  } finally {
    loading.value = false
  }
}

const canSubmit = computed(() =>
  form.value.lastName.trim() &&
  form.value.firstName.trim() &&
  form.value.phone.trim() &&
  form.value.email.trim() &&
  form.value.password &&
  form.value.passwordConfirm &&
  form.value.termsAccepted &&
  form.value.consentGiven &&
  !loading.value
)
</script>

<template>
  <div class="max-w-[480px] mx-auto px-4 py-10 lg:py-16">
    <h1 class="text-2xl font-bold text-[#222] mb-6 lg:mb-8">Регистрация</h1>

    <div v-if="success" class="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
      <div class="text-green-600 font-bold text-lg mb-2">Вы успешно зарегистрированы!</div>
      <NuxtLink to="/shop" class="text-brand text-sm no-underline hover:underline">Перейти в магазин →</NuxtLink>
    </div>

    <form v-else class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden" @submit.prevent="submit">
      <div class="px-5 py-5 lg:px-7 lg:py-6 flex flex-col gap-4 lg:gap-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Фамилия <span class="text-red-400">*</span></label>
            <input
              v-model="form.lastName"
              type="text"
              autocomplete="family-name"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Имя <span class="text-red-400">*</span></label>
            <input
              v-model="form.firstName"
              type="text"
              autocomplete="given-name"
              class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Номер телефона <span class="text-red-400">*</span></label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="+7 (910) 304-30-40"
            autocomplete="tel"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Email <span class="text-red-400">*</span></label>
          <input
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Пароль <span class="text-red-400">*</span></label>
          <input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-[#777] mb-1.5">Подтверждение пароля <span class="text-red-400">*</span></label>
          <input
            v-model="form.passwordConfirm"
            type="password"
            autocomplete="new-password"
            class="w-full border border-[#ddd] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        <!-- Пользовательское соглашение -->
        <label class="flex items-start gap-3 cursor-pointer select-none">
          <input
            v-model="form.termsAccepted"
            type="checkbox"
            class="mt-0.5 w-4 h-4 accent-brand shrink-0"
          />
          <span class="text-sm text-[#555] leading-relaxed">
            Я ознакомлен(а) и согласен(а) с условиями
            <NuxtLink to="/terms" target="_blank" class="text-brand no-underline hover:underline">
              Пользовательского соглашения
            </NuxtLink>
          </span>
        </label>

        <!-- Согласие 152-ФЗ -->
        <label class="flex items-start gap-3 cursor-pointer select-none">
          <input
            v-model="form.consentGiven"
            type="checkbox"
            class="mt-0.5 w-4 h-4 accent-brand shrink-0"
          />
          <span class="text-sm text-[#555] leading-relaxed">
            Я даю
            <NuxtLink to="/consent" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">
              согласие на обработку персональных данных
            </NuxtLink>
            и подтверждаю, что ознакомлен(а) с
            <NuxtLink to="/privacy" target="_blank" rel="noopener" class="text-brand no-underline hover:underline">
              Политикой обработки персональных данных
            </NuxtLink>
          </span>
        </label>

        <Transition name="fade">
          <div v-if="error" class="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">
            {{ error }}
          </div>
        </Transition>
      </div>

      <div class="px-5 py-4 lg:px-7 lg:py-5 border-t border-[#eee] flex items-center justify-between gap-3">
        <NuxtLink to="/login" class="text-sm text-[#999] no-underline hover:text-[#555] transition-colors">
          Уже есть аккаунт?
        </NuxtLink>
        <button
          type="submit"
          :disabled="!canSubmit"
          class="px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
        >
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
