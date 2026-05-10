import type { H3Event } from 'h3'

function isSecureRequest(event: H3Event) {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim()
  if (forwardedProto) return forwardedProto === 'https'

  return getRequestURL(event).protocol === 'https:'
}

export async function getAuthSession(event: H3Event) {
  // SESSION_SECRET валидируется на старте в server/plugins/check-config.ts
  return useSession<{ userId: number }>(event, {
    password: useRuntimeConfig().sessionSecret,
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
