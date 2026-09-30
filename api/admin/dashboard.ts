import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../_lib/response.js'
import { authenticateAdminRequest } from '../_lib/adminAuth.js'

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

  const [users, saved, shared, ratings, pendingComments, pendingPhotos] = await Promise.all([
    auth.supabase.from('profiles').select('*', { count: 'exact', head: true }),
    auth.supabase.from('saved_sandwiches').select('*', { count: 'exact', head: true }),
    auth.supabase.from('shared_sandwiches').select('*', { count: 'exact', head: true }),
    auth.supabase.from('ratings').select('*', { count: 'exact', head: true }),
    auth.supabase.from('comments').select('*', { count: 'exact', head: true }).or('is_flagged.eq.true,is_approved.eq.false'),
    auth.supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_approved', false),
  ])

  const results = [users, saved, shared, ratings, pendingComments, pendingPhotos]
  if (results.some((r) => r.error !== null)) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch dashboard metrics.', 500))
    return
  }

  res.status(200).json(ok({
    total_users: users.count ?? 0,
    total_saved_sandwiches: saved.count ?? 0,
    total_shared_links: shared.count ?? 0,
    total_ratings: ratings.count ?? 0,
    pending_moderation_count: (pendingComments.count ?? 0) + (pendingPhotos.count ?? 0),
  }))
}
