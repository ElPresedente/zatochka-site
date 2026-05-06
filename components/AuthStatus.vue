<script setup lang="ts">
const { user, fetchUser, logout } = useAuth()

await fetchUser()
</script>

<template>
  <div class="flex items-center justify-end gap-3 text-sm">
    <template v-if="user">
      <NuxtLink to="/account" class="text-right leading-tight no-underline group">
        <div class="text-[#777] text-xs">Здравствуйте,</div>
        <div class="font-semibold text-[#222] max-w-[160px] truncate group-hover:text-brand transition-colors">
          {{ user.firstName }}
        </div>
      </NuxtLink>
      <button
        type="button"
        class="px-3 py-1.5 rounded-lg border border-[#ddd] text-[#555] font-semibold hover:border-brand hover:text-brand transition-colors"
        @click="logout('/')"
      >
        Выйти
      </button>
    </template>
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
