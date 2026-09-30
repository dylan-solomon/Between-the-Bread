import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateAdminRequest } from '../../_lib/adminAuth.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  const { data, error } = await auth.supabase
    .from('photos')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false })

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch pending photos.', 500))
    return
  }

  res.status(200).json(ok(data))
}
