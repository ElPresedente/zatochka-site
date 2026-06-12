<script setup lang="ts">
const props = defineProps<{ mode?: 'dropdown' | 'inline' }>()
const mode = computed(() => props.mode ?? 'dropdown')

const { user, fetchUser, logout } = useAuth()
const route = useRoute()

await fetchUser()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// закрывать меню при переходе на другую страницу
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <div class="flex items-center justify-end gap-3 text-sm">
    <!-- Авторизован: компактная строка для телефона -->
    <template v-if="user && mode === 'inline'">
      <div class="flex items-center gap-2 w-full">
        <span class="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-brand/10 text-brand">
          <svg viewBox="0 0 24 24" fill="none" class="w-6 h-6" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </span>
        <NuxtLink
          to="/account"
          class="flex-1 basis-0 text-center px-3 py-2.5 rounded-lg border border-[#ddd] text-[#444] font-semibold no-underline hover:border-brand hover:text-brand transition-colors"
        >
          Профиль
        </NuxtLink>
        <button
          type="button"
          class="flex-1 basis-0 text-center px-3 py-2.5 rounded-lg border border-[#ddd] text-[#444] font-semibold hover:border-brand hover:text-brand transition-colors"
          @click="logout('/')"
        >
          Выход
        </button>
      </div>
    </template>

    <!-- Авторизован: выпадающее меню для десктопа -->
    <template v-else-if="user">
      <div ref="root" class="relative">
        <button
          type="button"
          class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-black/5 transition-colors"
          :aria-expanded="open"
          @click="open = !open"
        >
          <span class="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8" />
              <path
                d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </span>
          <span class="font-semibold text-[#222] max-w-[140px] truncate">{{ user.firstName }}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            class="w-4 h-4 text-[#999] transition-transform"
            :class="open ? 'rotate-180' : ''"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          leave-active-class="transition duration-100 ease-in"
          enter-from-class="opacity-0 -translate-y-1"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="open"
            class="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-black/5 py-1.5 z-50"
          >
            <div class="px-4 py-2 border-b border-black/5">
              <div class="text-[#777] text-xs">Здравствуйте,</div>
              <div class="font-semibold text-[#222] truncate">{{ user.firstName }} {{ user.lastName }}</div>
            </div>
            <NuxtLink
              to="/account"
              class="flex items-center gap-2.5 px-4 py-2.5 text-[#444] no-underline hover:bg-brand/5 hover:text-brand transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" class="w-[18px] h-[18px]" aria-hidden="true">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.6" />
                <path d="M5 19.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              Профиль
            </NuxtLink>
            <NuxtLink
              to="/account?tab=orders"
              class="flex items-center gap-2.5 px-4 py-2.5 text-[#444] no-underline hover:bg-brand/5 hover:text-brand transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" class="w-[18px] h-[18px]" aria-hidden="true">
                <path d="M6 3.5h12l1.5 4.5v11a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1v-11L6 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
                <path d="M9 11.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              Мои заказы
            </NuxtLink>
            <button
              type="button"
              class="w-full flex items-center gap-2.5 px-4 py-2.5 text-[#444] hover:bg-brand/5 hover:text-brand transition-colors border-t border-black/5 mt-1"
              @click="logout('/')"
            >
              <svg viewBox="0 0 24 24" fill="none" class="w-[18px] h-[18px]" aria-hidden="true">
                <path d="M15 16l4-4-4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19 12H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                <path d="M11 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
              Выход
            </button>
          </div>
        </Transition>
      </div>
    </template>

    <!-- Гость -->
    <template v-else>
      <NuxtLink
        to="/login"
        class="px-3 py-1.5 rounded-lg border border-[#ddd] text-[#555] font-semibold no-underline hover:border-brand hover:text-brand transition-colors"
      >
        Войти
      </NuxtLink>
      <NuxtLink
        to="/register"
        class="px-3 py-1.5 rounded-lg bg-brand text-white font-semibold no-underline hover:brightness-110 transition-all"
      >
        Регистрация
      </NuxtLink>
    </template>
  </div>
</template>
