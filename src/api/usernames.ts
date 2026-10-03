export type UsernameStatus = 'available' | 'taken' | 'reserved' | 'invalid'

const STATUSES: readonly string[] = ['available', 'taken', 'reserved', 'invalid']

const SAVE_ERRORS: Partial<Record<string, string>> = {
  USERNAME_TAKEN: 'That username is already taken.',
  USERNAME_RESERVED: "That username isn't available.",
  USERNAME_INVALID: 'Usernames are 3 to 20 letters, numbers or underscores.',
}

const SAVE_FAILED = "Couldn't save your username. Please try again."

const endpoint = (path: string): string => new URL(path, window.location.origin).toString()

const isStatus = (value: unknown): value is UsernameStatus => typeof value === 'string' && STATUSES.includes(value)

export const usernameFormatProblem = (name: string): string | null => {
  if (name.length < 3 || name.length > 20) return 'Usernames are 3 to 20 characters long.'
  if (!/^[A-Za-z0-9_]+$/.test(name)) return 'Use only letters, numbers and underscores.'
  return null
}

export const checkUsername = async (name: string): Promise<UsernameStatus> => {
  const response = await fetch(endpoint(`/api/usernames/${encodeURIComponent(name)}`))
  if (!response.ok) throw new Error(`Failed to check username: ${String(response.status)}`)

  const body = (await response.json()) as { data?: { status?: unknown } }
  const status = body.data?.status
  if (!isStatus(status)) throw new Error('Unexpected username check answer.')
  return status
}

export const saveUsername = async ({ token, username }: { token: string; username: string }): Promise<void> => {
  const response = await fetch(endpoint('/api/profile'), {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
  if (response.ok) return

  const body = (await response.json().catch(() => ({}))) as { error?: { code?: string } }
  throw new Error(SAVE_ERRORS[body.error?.code ?? ''] ?? SAVE_FAILED)
}

export const fetchOwnUsername = async (token: string): Promise<string | null> => {
  const response = await fetch(endpoint('/api/profile'), { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`Failed to load profile: ${String(response.status)}`)

  const body = (await response.json()) as { data?: { profile?: { username?: unknown } } }
  const username = body.data?.profile?.username
  return typeof username === 'string' ? username : null
}
