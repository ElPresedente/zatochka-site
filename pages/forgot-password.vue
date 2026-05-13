<script setup lang="ts">
useHead({ title: 'Восстановление пароля — Острый край' })

const phone = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { phone: phone.value } })
    sent.value = true
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Произошла ошибка. Попробуйте позже.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-[440px] mx-auto px-4 py-10 lg:py-16">
    <h1 class="text-2xl font-bold text-[#222] mb-2">Восстановление пароля</h1>
    <p class="text-[#888] text-sm mb-6 lg:mb-8">
      Укажите телефон, привязанный к аккаунту. Мы получим заявку и свяжемся с вами.
    </p>

    <Transition name="fade" mode="out-in">
      <!-- Success state -->
      <div v-if="sent" class="bg-white rounded-2xl shadow-sm border border-[#eee] px-5 py-6 lg:px-7 lg:py-8 text-center">
        <div class="text-4xl mb-4">✅</div>
        <div class="font-bold text-[#222] mb-2">Заявка отправлена</div>
        <p class="text-sm text-[#666] mb-6">
          Ваша заявка принята. Мы позвоним вам в рабочее время и поможем восстановить доступ.
        </p>
        <NuxtLink to="/login" class="btn-primary text-sm px-6 py-2.5">
          Вернуться ко входу
        </NuxtLink>
      </div>

      <!-- Form -->
      <form v-else class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden" @submit.prevent="submit">
        <div class="px-5 py-5 lg:px-7 lg:py-6 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-semibold text-[#777] mb-1.5">Телефон</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="+7 (910) 304-30-40"
              autocomplete="tel"
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
          <NuxtLink to="/login" class="text-sm text-[#999] no-underline hover:text-[#555] transition-colors">
            Вернуться ко входу
          </NuxtLink>
          <button
            type="submit"
            :disabled="loading || !phone.trim()"
            class="px-7 py-3 rounded-xl bg-brand text-white font-bold text-sm hover:brightness-110 transition-all shadow-[0_3px_0_rgba(9,136,189,0.5)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {{ loading ? 'Отправка...' : 'Отправить заявку' }}
          </button>
        </div>
      </form>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
