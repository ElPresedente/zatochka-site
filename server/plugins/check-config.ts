const DEFAULT_SESSION_SECRET = 'change-me-to-a-32-char-random-string'

export default defineNitroPlugin(() => {
  const { sessionSecret, databaseUrl } = useRuntimeConfig()

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  if (!sessionSecret || sessionSecret === DEFAULT_SESSION_SECRET || sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET is not configured securely (must be set and at least 32 characters)')
  }
})
