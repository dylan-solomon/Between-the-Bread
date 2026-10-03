import { hasFields } from '../utils/hasFields'

export type PublicProfile = {
  username: string
  is_admin: boolean
  joined_at: string
  comment_count: number
}

const isPublicProfile = (value: unknown): value is PublicProfile =>
  hasFields(value, { username: 'string', joined_at: 'string', comment_count: 'number' }) &&
  typeof value.is_admin === 'boolean'

export const fetchPublicProfile = async (username: string): Promise<PublicProfile | null> => {
  const url = new URL(`/api/profiles/${encodeURIComponent(username)}`, window.location.origin)
  const response = await fetch(url.toString())
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Failed to load profile: ${String(response.status)}`)

  const body = (await response.json()) as { data?: unknown }
  if (!isPublicProfile(body.data)) throw new Error('Unexpected profile answer.')
  return body.data
}
