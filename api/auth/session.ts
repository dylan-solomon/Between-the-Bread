import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ok, err } from '../_lib/response.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(err('UNAUTHORIZED', 'Missing or invalid authorization header.', 401))
    return
  }

  const token = authHeader.slice(7)

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing Supabase configuration.', 500))
    return
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error !== null || user === null) {
    res.status(401).json(err('UNAUTHORIZED', 'Invalid or expired session.', 401))
    return
  }

  res.status(200).json(ok({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
  }))
}
