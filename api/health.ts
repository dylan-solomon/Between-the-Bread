import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from './_lib/supabase.js'
import { ok, err } from './_lib/response.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { error } = await supabase.from('categories').select('count').single()

  if (error) {
    res.status(503).json(err('DB_UNAVAILABLE', 'Database is unavailable.', 503))
    return
  }

  res.status(200).json(ok({ status: 'ok' }))
}
