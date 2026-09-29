import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { authenticateRequest } from './auth.js'
import { err } from './response.js'

type AdminAuthResult = {
  supabase: SupabaseClient
  user: User
}

export const authenticateAdminRequest = async (
  req: VercelRequest,
  res: VercelResponse,
): Promise<AdminAuthResult | null> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return null

  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error !== null || !(data as { is_admin: boolean }).is_admin) {
    res.status(403).json(err('FORBIDDEN', 'Admin access required.', 403))
    return null
  }

  return { supabase, user }
}
