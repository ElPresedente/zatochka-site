<script setup lang="ts">
import { formatPhone } from '~/composables/useFormatters'
definePageMeta({ layout: 'admin' })
useHead({ title: 'Админ — Пользователи' })

interface UserRow {
  id: number
  lastName: string
  firstName: string
  phone: string
  consentGivenAt: string | null
  deletionRequestedAt: string | null
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

const resetPasswordUserId = ref<number | null>(null)
const resetPasswordValue = ref('')
const resetPasswordCopied = ref(false)
const resetPasswordLoading = ref(false)

async function resetPassword(u: UserRow) {
  if (!confirm(`Сгенерировать новый пароль для ${u.firstName} ${u.lastName}? Текущий пароль перестанет работать.`)) return
  resetPasswordLoading.value = true
  resetPasswordUserId.value = u.id
  resetPasswordValue.value = ''
  resetPasswordCopied.value = false
  try {
    const res = await $fetch<{ password: string }>(`/api/admin/users/${u.id}/reset-password`, { method: 'POST' })
    resetPasswordValue.value = res.password
  } finally {
    resetPasswordLoading.value = false
  }
}

async function copyPassword() {
  await navigator.clipboard.writeText(resetPasswordValue.value)
  resetPasswordCopied.value = true
  setTimeout(() => { resetPasswordCopied.value = false }, 2000)
}

function closeResetPassword() {
  resetPasswordUserId.value = null
  resetPasswordValue.value = ''
  resetPasswordCopied.value = false
}

async function deleteUser(u: UserRow) {
  if (!confirm(`Удалить аккаунт ${u.lastName} ${u.firstName}? Это действие необратимо.`)) return
  await $fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="bg-white border-b border-[#eee] px-4 lg:px-8 py-4 lg:py-5 shrink-0">
    <h1 class="text-lg lg:text-xl font-bold text-[#222]">Пользователи</h1>
  </div>

  <div class="flex-1 overflow-y-auto px-3 lg:px-8 py-4 lg:py-6">
    <!-- Desktop: table -->
    <div class="hidden lg:block bg-white rounded-2xl shadow-sm border border-[#eee] overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[#eee] text-left">
            <th class="px-5 py-3.5 font-semibold text-[#777] w-8">#</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">ФИО</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Телефон</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Согласие ПДн</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Зарегистрирован</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]">Роль</th>
            <th class="px-5 py-3.5 font-semibold text-[#777]" colspan="3"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            class="border-b border-[#f5f5f5] transition-colors"
            :class="u.deletionRequestedAt ? 'bg-red-50 hover:bg-red-100/70' : 'hover:bg-[#fafafa]'"
          >
            <td class="px-5 py-3.5 text-[#bbb]">{{ u.id }}</td>
            <td class="px-5 py-3.5 font-medium text-[#222]">
              {{ u.lastName }} {{ u.firstName }}
              <span v-if="u.deletionRequestedAt" class="ml-2 text-[10px] font-bold uppercase tracking-wide text-red-500 bg-red-100 px-1.5 py-0.5 rounded">
                Запрос на удаление
              </span>
            </td>
            <td class="px-5 py-3.5 text-[#555]">{{ formatPhone(u.phone) }}</td>
            <td class="px-5 py-3.5">
              <span v-if="u.deletionRequestedAt" class="text-red-500 text-xs font-semibold">
                Отозвано {{ formatDate(u.deletionRequestedAt) }}
              </span>
              <span v-else-if="u.consentGivenAt" class="text-green-600 text-xs font-semibold">
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
            <td class="px-5 py-3.5 text-right">
              <button
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
                :disabled="resetPasswordLoading && resetPasswordUserId === u.id"
                @click="resetPassword(u)"
              >
                Сбросить пароль
              </button>
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                v-if="u.deletionRequestedAt && u.id !== currentUser?.id"
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                @click="deleteUser(u)"
              >
                Удалить
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!users?.length" class="text-center text-[#aaa] py-16">
        Нет зарегистрированных пользователей
      </div>
    </div>

    <!-- Mobile: cards -->
    <div class="lg:hidden flex flex-col gap-3">
      <div
        v-for="u in users"
        :key="u.id"
        class="rounded-2xl shadow-sm border p-4 flex flex-col gap-2"
        :class="u.deletionRequestedAt ? 'bg-red-50 border-red-200' : 'bg-white border-[#eee]'"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="font-semibold text-[#222] truncate">{{ u.lastName }} {{ u.firstName }}</div>
            <div class="text-sm text-[#666]">{{ formatPhone(u.phone) }}</div>
          </div>
          <span
            class="text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 whitespace-nowrap"
            :class="u.isAdmin ? 'bg-brand/10 text-brand' : 'bg-[#f5f5f5] text-[#888]'"
          >
            {{ u.isAdmin ? 'Админ' : 'Юзер' }}
          </span>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#888]">
          <span>ID: <span class="text-[#555]">{{ u.id }}</span></span>
          <span>Регистрация: <span class="text-[#555]">{{ formatDate(u.createdAt) }}</span></span>
          <span v-if="u.deletionRequestedAt" class="text-red-500 font-semibold">
            Запрос на удаление {{ formatDate(u.deletionRequestedAt) }}
          </span>
          <span v-else-if="u.consentGivenAt" class="text-green-600">
            ✓ ПДн {{ formatDate(u.consentGivenAt) }}
          </span>
        </div>
        <div class="flex justify-end gap-2 mt-1 flex-wrap">
          <button
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors"
            @click="resetPassword(u)"
          >
            Сбросить пароль
          </button>
          <button
            v-if="u.id !== currentUser?.id"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            :class="u.isAdmin
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'bg-brand/10 text-brand hover:bg-brand/20'"
            @click="toggleAdmin(u)"
          >
            {{ u.isAdmin ? 'Снять админа' : 'Назначить админом' }}
          </button>
          <span v-else class="text-xs text-[#ccc]">вы</span>
          <button
            v-if="u.deletionRequestedAt && u.id !== currentUser?.id"
            class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            @click="deleteUser(u)"
          >
            Удалить аккаунт
          </button>
        </div>
      </div>
      <div v-if="!users?.length" class="text-center text-[#aaa] py-16">
        Нет зарегистрированных пользователей
      </div>
    </div>
  </div>

  <!-- Reset password modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="resetPasswordValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        @click.self="closeResetPassword"
      >
        <div class="bg-white rounded-2xl shadow-xl border border-[#eee] w-full max-w-sm p-6">
          <div class="text-base font-bold text-[#222] mb-1">Новый пароль</div>
          <p class="text-xs text-[#888] mb-4">
            Скопируйте пароль и передайте пользователю. После закрытия он больше не будет доступен.
          </p>

          <div class="flex items-center gap-2 bg-[#f5f5f5] rounded-xl px-4 py-3 mb-4">
            <span class="flex-1 font-mono text-lg font-bold tracking-widest text-[#222] select-all">
              {{ resetPasswordValue }}
            </span>
            <button
              class="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              :class="resetPasswordCopied ? 'bg-green-100 text-green-600' : 'bg-brand/10 text-brand hover:bg-brand/20'"
              @click="copyPassword"
            >
              {{ resetPasswordCopied ? 'Скопировано!' : 'Копировать' }}
            </button>
          </div>

          <button
            class="w-full py-2.5 rounded-xl bg-[#f5f5f5] text-[#555] text-sm font-semibold hover:bg-[#eee] transition-colors"
            @click="closeResetPassword"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
