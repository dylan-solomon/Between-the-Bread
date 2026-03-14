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

  const { data, error } = await supabase
    .from('compat_matrix')
    .select('group_a, group_b, affinity')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch compat matrix.', 500))
    return
  }

  const rows = data as Array<{ group_a: string; group_b: string; affinity: number }>
  res.status(200).json(ok(rows, { row_count: rows.length }))
}
