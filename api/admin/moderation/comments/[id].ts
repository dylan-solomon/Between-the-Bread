import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../../_lib/response.js'
import { authenticateAdminRequest } from '../../../_lib/adminAuth.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'PATCH') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  const { id } = req.query as { id: string }
  const body = (req.body ?? {}) as Record<string, unknown>
  const { action } = body

  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json(err('INVALID_ACTION', 'action must be "approve" or "reject".', 400))
    return
  }

  if (action === 'reject') {
    const { error } = await auth.supabase.from('comments').delete().eq('id', id)
    if (error !== null) {
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to reject comment.', 500))
      return
    }
    res.status(200).json(ok({ id, rejected: true }))
    return
  }

  const { data, error } = await auth.supabase
    .from('comments')
    .update({ is_approved: true, is_flagged: false })
    .eq('id', id)
    .select('id, user_id, target_type, target_id, parent_id, body, is_flagged, is_approved, like_count, reply_count, created_at, updated_at')
    .single()

  if (error !== null) {
    res.status(404).json(err('NOT_FOUND', 'Comment not found.', 404))
    return
  }

  res.status(200).json(ok(data))
}
