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
</script>

<template>
  <header class="bg-white shadow-[0_1px_0_#e0e0e0] sticky top-0 z-50 w-full">
    <div class="h-[110px] flex items-center justify-between px-12 max-w-[1440px] mx-auto w-full">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-3 no-underline">
        <img src="/images/logo.png" alt="Острый край" class="w-[90px] h-[90px] object-contain" />
      </NuxtLink>

      <!-- Nav -->
      <nav class="flex gap-2 items-center">
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

      <!-- Contacts and auth -->
      <div class="flex flex-col gap-2 items-end">
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
    </div>

    <!-- Brand stripe -->
    <div class="h-5 bg-brand" />
  </header>
</template>
