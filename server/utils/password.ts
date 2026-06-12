// Excludes visually ambiguous chars: 0/O, 1/l/I
const CHARSET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Генерирует читаемый случайный пароль (по умолчанию 12 символов). */
export function generatePassword(length = 12): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return result
}
