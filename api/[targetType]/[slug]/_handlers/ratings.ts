import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../../_lib/response.js'
import { authenticateRequest } from '../../../_lib/auth.js'

const VALID_TARGET_TYPES = ['database', 'community'] as const
type TargetType = (typeof VALID_TARGET_TYPES)[number]

const isValidTargetType = (value: unknown): value is TargetType =>
  typeof value === 'string' && (VALID_TARGET_TYPES as readonly string[]).includes(value)

const isValidScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const { targetType } = req.query as Record<string, string | undefined>

  if (!isValidTargetType(targetType)) {
    res.status(400).json(err('INVALID_TARGET_TYPE', 'targetType must be "database" or "community".', 400))
    return
  }

  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>
  const { target_id, score } = body

  if (typeof target_id !== 'string' || target_id.trim() === '') {
    res.status(400).json(err('MISSING_TARGET_ID', 'target_id is required.', 400))
    return
  }

  if (!isValidScore(score)) {
    res.status(400).json(err('INVALID_SCORE', 'score must be an integer between 1 and 5.', 400))
    return
  }

  const { data, error } = await supabase
    .from('ratings')
    .upsert(
      { user_id: user.id, target_type: targetType, target_id, score },
      { onConflict: 'user_id,target_type,target_id' },
    )
    .select('id, target_type, target_id, score, created_at, updated_at')
    .single()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to save rating.', 500))
    return
  }

  res.status(200).json(ok(data))
}
