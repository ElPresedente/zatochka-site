<script setup lang="ts">
const route = useRoute()
const { user, fetchUser } = useAuth()

await fetchUser()

const navLinks = [
  { label: 'Главная', to: '/' },
  { label: 'Услуги', to: '/services' },
  { label: 'Галерея', to: '/gallery' },
  { label: 'О нас', to: '/about' },
  { label: 'Магазин', to: '/shop' },
  { label: 'Админ', to: '/admin' },
]

const visibleNavLinks = computed(() =>
  navLinks.filter(link => link.to !== '/admin' || user.value?.isAdmin)
)

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}

const mobileOpen = ref(false)

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

watch(mobileOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <header class="bg-white shadow-[0_1px_0_#e0e0e0] sticky top-0 z-50 w-full">
    <!-- Top bar -->
    <div class="h-[68px] lg:h-[110px] flex items-center justify-between px-4 lg:px-12 max-w-[1440px] mx-auto w-full">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-3 no-underline">
        <img
          src="/images/logo.png"
          alt="Острый край"
          class="w-[48px] h-[48px] lg:w-[90px] lg:h-[90px] object-contain"
        />
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden lg:flex gap-2 items-center">
        <NuxtLink
          v-for="link in visibleNavLinks"
          :key="link.to"
          :to="link.to"
          class="px-[18px] py-2.5 rounded-xl font-bold text-lg transition-all duration-150 no-underline border-[3px]"
          :class="isActive(link.to)
            ? 'bg-brand border-brand text-white'
            : 'bg-transparent border-transparent text-black hover:bg-brand/10'"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Desktop contacts and auth -->
      <div class="hidden lg:flex flex-col gap-2 items-end">
        <a
          href="tel:+79103043040"
          class="flex items-center gap-2 no-underline text-black text-base"
        >
          <img src="/images/phone_icon.png" class="w-5 h-4 object-contain" alt="" />
          +7 (910) 304-30-40
        </a>
        <a
          href="mailto:zatochka_test@yandex.ru"
          class="flex items-center gap-2 no-underline text-black text-base"
        >
          <img src="/images/email_icon.png" class="w-5 h-4 object-contain" alt="" />
          zatochka_test@yandex.ru
        </a>
        <AuthStatus />
      </div>

      <!-- Mobile burger -->
      <button
        type="button"
        class="lg:hidden flex items-center justify-center w-11 h-11 rounded-lg hover:bg-black/5 transition-colors"
        :aria-expanded="mobileOpen"
        aria-label="Меню"
        @click="mobileOpen = !mobileOpen"
      >
        <span class="relative block w-6 h-5">
          <span
            class="absolute left-0 right-0 h-0.5 bg-black rounded-full transition-all duration-200"
            :class="mobileOpen ? 'top-2 rotate-45' : 'top-0'"
          />
          <span
            class="absolute left-0 right-0 top-2 h-0.5 bg-black rounded-full transition-opacity duration-200"
            :class="mobileOpen ? 'opacity-0' : 'opacity-100'"
          />
          <span
            class="absolute left-0 right-0 h-0.5 bg-black rounded-full transition-all duration-200"
            :class="mobileOpen ? 'top-2 -rotate-45' : 'top-4'"
          />
        </span>
      </button>
    </div>

    <!-- Brand stripe -->
    <div class="h-3 lg:h-5 bg-brand" />

    <!-- Mobile drawer -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        class="lg:hidden absolute left-0 right-0 top-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] border-t border-black/5 max-h-[calc(100vh-80px)] overflow-y-auto"
      >
        <nav class="flex flex-col px-4 py-3 gap-1">
          <NuxtLink
            v-for="link in visibleNavLinks"
            :key="link.to"
            :to="link.to"
            class="px-4 py-3 rounded-xl font-bold text-base no-underline border-2 transition-colors"
            :class="isActive(link.to)
              ? 'bg-brand border-brand text-white'
              : 'bg-transparent border-transparent text-black hover:bg-brand/10'"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="border-t border-black/5 px-4 py-4 flex flex-col gap-2">
          <a
            href="tel:+79103043040"
            class="flex items-center gap-2 no-underline text-black text-base"
          >
            <img src="/images/phone_icon.png" class="w-5 h-4 object-contain" alt="" />
            +7 (910) 304-30-40
          </a>
          <a
            href="mailto:zatochka_test@yandex.ru"
            class="flex items-center gap-2 no-underline text-black text-base break-all"
          >
            <img src="/images/email_icon.png" class="w-5 h-4 object-contain shrink-0" alt="" />
            zatochka_test@yandex.ru
          </a>
        </div>

        <div class="border-t border-black/5 px-4 py-4">
          <AuthStatus />
        </div>
      </div>
    </Transition>
  </header>
</template>
