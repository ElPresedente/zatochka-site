interface AuthUser {
  id: number
  firstName: string
  lastName: string
  phone: string
  email: string | null
  isAdmin: boolean
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth.user', () => null)
  const initialized = useState('auth.initialized', () => false)

  async function fetchUser(force = false) {
    if (initialized.value && !force) return
    try {
      const requestFetch = import.meta.server ? useRequestFetch() : $fetch
      user.value = await requestFetch<AuthUser>('/api/auth/me')
      initialized.value = true
    }
    catch (err: any) {
      const status = err?.statusCode ?? err?.response?.status
      if (status === 401) {
        user.value = null
        initialized.value = true
        return
      }
      if (import.meta.client) {
        console.error('[useAuth] fetchUser failed', err)
      }
      // Не сбрасываем user и initialized: при 5xx/сетевой ошибке
      // следующий вызов fetchUser попробует снова.
    }
  }

  async function login(loginInput: string, password: string) {
    user.value = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: { login: loginInput, password },
    })
    initialized.value = true
  }

  async function logout(redirectTo = '/login') {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    initialized.value = true
    await navigateTo(redirectTo)
  }

  return { user, initialized, login, logout, fetchUser }
}
