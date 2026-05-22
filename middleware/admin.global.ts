export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return

  try {
    const requestFetch = import.meta.server ? useRequestFetch() : $fetch
    const user = await requestFetch<{ isAdmin: boolean }>('/api/auth/me')
    if (!user?.isAdmin) return navigateTo('/admin/login')
  } catch {
    return navigateTo('/admin/login')
  }
})
