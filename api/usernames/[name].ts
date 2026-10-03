import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../_lib/supabase.js'
import { ok, err } from '../_lib/response.js'
import { isUsernameFormat, isUsernameStatus } from '../_lib/username.js'

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { name } = req.query
  if (typeof name !== 'string' || name === '') {
    res.status(400).json(err('INVALID_INPUT', 'A username is required.', 400))
    return
  }

  if (!isUsernameFormat(name)) {
    res.status(200).json(ok({ username: name, status: 'invalid' }))
    return
  }

  const response = await supabase.rpc('username_status', { p_username: name })
  const data: unknown = response.data
  if (response.error !== null || !isUsernameStatus(data)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to check username.', 500))
    return
  }

  res.status(200).json(ok({ username: name, status: data }))
}
