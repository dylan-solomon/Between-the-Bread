import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../../../_lib/response.js'
import { authenticateRequest } from '../../../../_lib/auth.js'
import type { SupabaseClient } from '@supabase/supabase-js'

const UNIQUE_VIOLATION = '23505'

const respondWithLikeCount = async (res: VercelResponse, supabase: SupabaseClient, commentId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('comments')
    .select('like_count')
    .eq('id', commentId)
    .single<{ like_count: number }>()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to read like count.', 500))
    return
  }

  res.status(200).json(ok({ like_count: data.like_count }))
}

const handlePost = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const { id } = req.query as { id: string }

  const { error: insertError } = await supabase
    .from('comment_likes')
    .insert({ user_id: user.id, comment_id: id })

  if (insertError !== null) {
    if (insertError.code === UNIQUE_VIOLATION) {
      res.status(409).json(err('ALREADY_LIKED', 'You have already liked this comment.', 409))
      return
    }
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to like comment.', 500))
    return
  }

  await respondWithLikeCount(res, supabase, id)
}

const handleDelete = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const { id } = req.query as { id: string }

  const { data, error: deleteError } = await supabase
    .from('comment_likes')
    .delete()
    .eq('user_id', user.id)
    .eq('comment_id', id)
    .select('id')

  if (deleteError !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to unlike comment.', 500))
    return
  }

  const deletedRows = data as { id: string }[]
  if (deletedRows.length === 0) {
    res.status(404).json(err('NOT_LIKED', 'You have not liked this comment.', 404))
    return
  }

  await respondWithLikeCount(res, supabase, id)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  switch (req.method) {
    case 'POST':
      await handlePost(req, res)
      return
    case 'DELETE':
      await handleDelete(req, res)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
