interface AuthUser {
  id: number
  firstName: string
  lastName: string
  phone: string
  isAdmin: boolean
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth.user', () => null)
  const initialized = useState('auth.initialized', () => false)

  async function fetchUser(force = false) {
    if (initialized.value && !force) return
    try {
      user.value = await $fetch<AuthUser>('/api/auth/me')
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  async function login(phone: string, password: string) {
    user.value = await $fetch<AuthUser>('/api/auth/login', {
      method: 'POST',
      body: { phone, password },
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
