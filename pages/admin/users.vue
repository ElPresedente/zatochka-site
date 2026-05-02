<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Пользователи' })

interface UserRow {
  id: number
  lastName: string
  firstName: string
  phone: string
  consentGivenAt: string | null
  createdAt: string
  isAdmin: boolean
}

const { user: currentUser } = useAuth()
const { data: users, refresh } = await useFetch<UserRow[]>('/api/admin/users')

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function toggleAdmin(u: UserRow) {
  if (u.id === currentUser.value?.id) return
  if (u.isAdmin) {
    if (!confirm(`Снять права администратора у ${u.firstName} ${u.lastName}?`)) return
    await $fetch(`/api/admin/users/${u.id}/promote`, { method: 'DELETE' })
  } else {
    if (!confirm(`Назначить ${u.firstName} ${u.lastName} администратором?`)) return
    await $fetch(`/api/admin/users/${u.id}/promote`, { method: 'POST' })
  }
  await refresh()
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-8 py-5 shrink-0">
    <h1 class="text-xl font-bold text-[#222]">Пользователи</h1>
  </div>

  <div class="flex-1 overflow-y-auto px-8 py-6">
    <div class="bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[#eee] text-left">
            <th class="px-5 py-3.5 font-semibold text-[#777] w-8">#</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">ФИО</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Телефон</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Согласие ПДн</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Зарегистрирован</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Роль</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            class="border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors"
          >
            <td class="px-5 py-3.5 text-[#bbb]">{{ u.id }}</td>
            <td class="px-5 py-3.5 font-medium text-[#222]">{{ u.lastName }} {{ u.firstName }}</td>
            <td class="px-5 py-3.5 text-[#555]">{{ u.phone }}</td>
            <td class="px-5 py-3.5">
              <span v-if="u.consentGivenAt" class="text-green-600 text-xs font-semibold">
                ✓ {{ formatDate(u.consentGivenAt) }}
              </span>
              <span v-else class="text-[#bbb] text-xs">—</span>
            </td>
            <td class="px-5 py-3.5 text-[#888]">{{ formatDate(u.createdAt) }}</td>
            <td class="px-5 py-3.5">
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-lg"
                :class="u.isAdmin ? 'bg-brand/10 text-brand' : 'bg-[#f5f5f5] text-[#888]'"
              >
                {{ u.isAdmin ? 'Администратор' : 'Пользователь' }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                v-if="u.id !== currentUser?.id"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                :class="u.isAdmin
                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                  : 'bg-brand/10 text-brand hover:bg-brand/20'"
                @click="toggleAdmin(u)"
              >
                {{ u.isAdmin ? 'Снять' : 'Назначить' }}
              </button>
              <span v-else class="text-xs text-[#ccc]">вы</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!users?.length" class="text-center text-[#aaa] py-16">
        Нет зарегистрированных пользователей
      </div>
    </div>
  </div>
</template>
