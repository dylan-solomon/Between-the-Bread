import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { setPublicCache } from '../_lib/publicCache.js'
import { isUsernameFormat } from '../_lib/username.js'

const notFound = (res: VercelResponse): void => {
  res.status(404).json(err('PROFILE_NOT_FOUND', 'Profile not found.', 404))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { username } = req.query
  if (!isUsernameFormat(username)) {
    notFound(res)
    return
  }

  const response = await supabase.rpc('public_profile', { p_username: username })
  const data: unknown = response.data
  if (response.error !== null || !Array.isArray(data)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to load profile.', 500))
    return
  }

  const [profile] = data as unknown[]
  if (profile === undefined) {
    notFound(res)
    return
  }

  setPublicCache(res)
  res.status(200).json(ok(profile))
}
