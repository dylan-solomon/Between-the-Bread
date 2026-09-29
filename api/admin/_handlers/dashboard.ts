import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '../../_lib/response.js'

const handleGet = async (res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const [users, saved, shared, ratings, pendingComments, pendingPhotos] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('saved_sandwiches').select('*', { count: 'exact', head: true }),
    supabase.from('shared_sandwiches').select('*', { count: 'exact', head: true }),
    supabase.from('ratings').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).or('is_flagged.eq.true,is_approved.eq.false'),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_approved', false),
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

export default async function handleDashboard(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
): Promise<void> {
  switch (req.method) {
    case 'GET':
      await handleGet(res, supabase)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
