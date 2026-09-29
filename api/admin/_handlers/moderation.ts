import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '../../_lib/response.js'

type Resource = 'comments' | 'photos'

const isValidResource = (value: string): value is Resource => value === 'comments' || value === 'photos'

const handleGet = async (res: VercelResponse, supabase: SupabaseClient, resource: Resource): Promise<void> => {
  const query = resource === 'comments'
    ? supabase.from('comments').select('*').or('is_flagged.eq.true,is_approved.eq.false').order('created_at', { ascending: false })
    : supabase.from('photos').select('*').eq('is_approved', false).order('created_at', { ascending: false })

  const { data, error } = await query

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', `Failed to fetch pending ${resource}.`, 500))
    return
  }

  res.status(200).json(ok(data))
}

const handlePatch = async (req: VercelRequest, res: VercelResponse, supabase: SupabaseClient, resource: Resource, id: string | undefined): Promise<void> => {
  if (id === undefined) {
    res.status(400).json(err('MISSING_ID', 'An id is required.', 400))
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const { action } = body

  if (action !== 'approve' && action !== 'reject') {
    res.status(400).json(err('INVALID_ACTION', 'action must be "approve" or "reject".', 400))
    return
  }

  if (action === 'reject') {
    const { error } = await supabase.from(resource).delete().eq('id', id)
    if (error !== null) {
      res.status(500).json(err('INTERNAL_ERROR', `Failed to reject ${resource === 'comments' ? 'comment' : 'photo'}.`, 500))
      return
    }
    res.status(200).json(ok({ id, rejected: true }))
    return
  }

  const updates = resource === 'comments' ? { is_approved: true, is_flagged: false } : { is_approved: true }
  const columns = resource === 'comments'
    ? 'id, user_id, target_type, target_id, parent_id, body, is_flagged, is_approved, like_count, reply_count, created_at, updated_at'
    : 'id, user_id, target_type, target_id, storage_path, caption, is_approved, created_at'
  const { data, error } = await supabase.from(resource).update(updates).eq('id', id).select(columns).single()

  if (error !== null) {
    res.status(404).json(err('NOT_FOUND', `${resource === 'comments' ? 'Comment' : 'Photo'} not found.`, 404))
    return
  }

  res.status(200).json(ok(data))
}

export default async function handleModeration(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
  resource: string,
  id: string | undefined,
): Promise<void> {
  if (!isValidResource(resource)) {
    res.status(404).json(err('NOT_FOUND', 'Unknown moderation resource.', 404))
    return
  }

  switch (req.method) {
    case 'GET':
      await handleGet(res, supabase, resource)
      return
    case 'PATCH':
      await handlePatch(req, res, supabase, resource, id)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
