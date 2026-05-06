export default defineNuxtRouteMiddleware(async (to) => {
  try {
    const requestFetch = import.meta.server ? useRequestFetch() : $fetch
    await requestFetch<{ id: number }>('/api/auth/me')
  } catch {
    return navigateTo(`/login?next=${to.fullPath}`)
  }
})
