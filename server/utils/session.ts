import type { H3Event } from 'h3'

const DEFAULT_SESSION_SECRET = 'change-me-to-a-32-char-random-string'

function getSessionSecret() {
  const secret = useRuntimeConfig().sessionSecret

  if (!secret || secret === DEFAULT_SESSION_SECRET || secret.length < 32) {
    throw createError({
      statusCode: 500,
      message: 'SESSION_SECRET is not configured securely',
    })
  }

  return secret
}

function isSecureRequest(event: H3Event) {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedProto) return forwardedProto === 'https'

  return getRequestURL(event).protocol === 'https:'
}

export async function getAuthSession(event: H3Event) {
  return useSession<{ userId: number }>(event, {
    password: getSessionSecret(),
    name: 'sid',
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureRequest(event),
      path: '/',
    },
  })
}
