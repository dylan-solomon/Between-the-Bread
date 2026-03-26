import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import { err } from './response.js'

type AuthResult = {
  supabase: SupabaseClient
  user: User
}

export const authenticateRequest = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthResult | null> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(err('UNAUTHORIZED', 'Missing or invalid authorization header.', 401))
    return null
  }

  const token = authHeader.slice(7)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing Supabase configuration.', 500))
    return null
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error !== null || user === null) {
    res.status(401).json(err('UNAUTHORIZED', 'Invalid or expired session.', 401))
    return null
  }

  return { supabase, user }
}
