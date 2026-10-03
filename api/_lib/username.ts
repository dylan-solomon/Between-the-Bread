export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/

export const USERNAME_STATUSES = ['available', 'taken', 'reserved', 'invalid'] as const

export type UsernameStatus = (typeof USERNAME_STATUSES)[number]

export const isUsernameFormat = (value: unknown): value is string =>
  typeof value === 'string' && USERNAME_PATTERN.test(value)

export const isUsernameStatus = (value: unknown): value is UsernameStatus =>
  typeof value === 'string' && (USERNAME_STATUSES as readonly string[]).includes(value)
