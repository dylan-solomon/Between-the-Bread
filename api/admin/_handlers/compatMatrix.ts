import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '../../_lib/response.js'

const VALID_GROUPS = [
  'american',
  'asian_fusion',
  'deli_classic',
  'italian',
  'mediterranean',
  'neutral',
  'southern',
  'tex_mex',
] as const

const isValidGroup = (value: unknown): value is string =>
  typeof value === 'string' && (VALID_GROUPS as readonly string[]).includes(value)

const isValidAffinity = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1

const handlePatch = async (req: VercelRequest, res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const { group_a, group_b, affinity } = body

  if (!isValidGroup(group_a) || !isValidGroup(group_b)) {
    res.status(400).json(err('INVALID_GROUP', 'group_a and group_b must be valid compat groups.', 400))
    return
  }

  if (!isValidAffinity(affinity)) {
    res.status(400).json(err('INVALID_AFFINITY', 'affinity must be a number between 0 and 1.', 400))
    return
  }

  const forward = await supabase.from('compat_matrix').update({ affinity }).eq('group_a', group_a).eq('group_b', group_b)
  const reverse = await supabase.from('compat_matrix').update({ affinity }).eq('group_a', group_b).eq('group_b', group_a)

  if (forward.error !== null || reverse.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to update compatibility matrix.', 500))
    return
  }

  res.status(200).json(ok({ group_a, group_b, affinity }))
}

export default async function handleCompatMatrix(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
): Promise<void> {
  switch (req.method) {
    case 'PATCH':
      await handlePatch(req, res, supabase)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
