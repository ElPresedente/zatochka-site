import { users } from './schema'

/**
 * Безопасный набор полей пользователя, который можно отдавать наружу
 * или передавать между endpoint-ами. НЕ содержит passwordHash.
 */
export const userPublicColumns = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  consentGivenAt: users.consentGivenAt,
  consentVersion: users.consentVersion,
  createdAt: users.createdAt,
} as const
