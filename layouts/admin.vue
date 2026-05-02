<script setup lang="ts">
const route = useRoute()
const { user, fetchUser, logout } = useAuth()

await fetchUser()

const navItems = [
  { to: '/admin', label: 'Дашборд', icon: '📊', exact: true },
  { to: '/admin/orders', label: 'Заказы', icon: '📋' },
  { to: '/admin/products', label: 'Товары', icon: '🛒' },
  { to: '/admin/gallery', label: 'Галерея', icon: '🖼️' },
  { to: '/admin/prices', label: 'Прайс', icon: '💰' },
  { to: '/admin/workers', label: 'Работники', icon: '👷' },
  { to: '/admin/contacts', label: 'Настройки', icon: '⚙️' },
  { to: '/admin/users', label: 'Пользователи', icon: '👤' },
]

function isActive(item: { to: string; exact?: boolean }) {
  if (item.exact) return route.path === item.to
  return route.path.startsWith(item.to)
}
</script>

<template>
  <div class="flex h-screen bg-[rgb(245,245,245)] font-[Inter,sans-serif] overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-[220px] bg-[rgb(36,35,35)] flex flex-col shrink-0">
      <div class="px-6 py-6 border-b border-white/10">
        <NuxtLink to="/" class="text-white font-bold text-lg no-underline leading-snug">
          Острый край<br />
          <span class="text-brand text-sm font-normal">Админ-панель</span>
        </NuxtLink>
      </div>
      <nav class="flex-1 px-3 py-4 flex flex-col gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors no-underline"
          :class="isActive(item)
            ? 'bg-brand text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="px-5 py-4 border-t border-white/10 flex flex-col gap-2">
        <div v-if="user" class="text-white/50 text-xs truncate px-1">
          {{ user.firstName }} {{ user.lastName }}
        </div>
        <div class="flex items-center justify-between">
          <NuxtLink to="/" class="text-white/50 text-xs hover:text-white/80 no-underline transition-colors">
            ← На сайт
          </NuxtLink>
          <button
            class="text-white/40 text-xs hover:text-red-400 transition-colors"
            @click="logout('/admin/login')"
          >
            Выйти
          </button>
        </div>
      </div>
    </aside>

    <!-- Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <slot />
    </div>
  </div>
</template>
