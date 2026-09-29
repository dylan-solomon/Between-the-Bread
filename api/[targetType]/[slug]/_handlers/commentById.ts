import type { VercelRequest, VercelResponse } from '@vercel/node'
import { err } from '../../../_lib/response.js'
import { authenticateRequest } from '../../../_lib/auth.js'

const handleDelete = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase } = auth
  const { id } = req.query as { id: string }

  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
    .select('parent_id')

  if (error !== null) {
    res.status(500).json(err('DELETE_FAILED', 'Failed to delete comment.', 500))
    return
  }

  const deletedRows = data as { parent_id: string | null }[]
  const parentId = deletedRows[0]?.parent_id ?? null

  if (parentId !== null) {
    await supabase.rpc('adjust_comment_reply_count', { p_comment_id: parentId, p_delta: -1 })
  }

  res.status(204).end()
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  switch (req.method) {
    case 'DELETE':
      await handleDelete(req, res)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
