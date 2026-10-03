import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ok, err } from '../_lib/response.js'
import { authenticateRequest } from '../_lib/auth.js'
import { isDietaryTag } from '../_lib/dietaryTags.js'
import { isUsernameFormat } from '../_lib/username.js'

const VALID_COST_CONTEXTS = ['retail', 'restaurant']
const UPDATABLE_FIELDS = [
  'display_name',
  'dietary_filters',
  'smart_mode_default',
  'double_protein',
  'double_cheese',
  'cost_context',
  'username',
] as const

const UPDATE_ERRORS: Partial<Record<string, { status: number; code: string; message: string }>> = {
  '23505': { status: 409, code: 'USERNAME_TAKEN', message: 'That username is already taken.' },
  '23514': { status: 400, code: 'USERNAME_RESERVED', message: 'That username is not available.' },
}

const handleGet = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, username, dietary_filters, smart_mode_default, double_protein, double_cheese, cost_context, is_admin, created_at, updated_at')
    .eq('id', user.id)
    .single()

  if (error !== null) {
    res.status(404).json(err('NOT_FOUND', 'Profile not found.', 404))
    return
  }

  res.status(200).json(ok({ profile: data }))
}

const validatePatchBody = (body: Record<string, unknown>): string | null => {
  const keys = Object.keys(body).filter((k) =>
    (UPDATABLE_FIELDS as readonly string[]).includes(k),
  )

  if (keys.length === 0) {
    return 'Request body must contain at least one updatable field.'
  }

  if ('cost_context' in body && !VALID_COST_CONTEXTS.includes(body.cost_context as string)) {
    return 'cost_context must be "retail" or "restaurant".'
  }

  if ('dietary_filters' in body) {
    const filters = body.dietary_filters
    if (!Array.isArray(filters) || filters.some((f) => !isDietaryTag(f as string))) {
      return 'dietary_filters must be an array of valid dietary tags.'
    }
  }

  return null
}

const handlePatch = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>

  if ('username' in body && !isUsernameFormat(body.username)) {
    res
      .status(400)
      .json(err('USERNAME_INVALID', 'Usernames are 3 to 20 letters, numbers or underscores.', 400))
    return
  }

  const validationError = validatePatchBody(body)
  if (validationError !== null) {
    res.status(400).json(err('VALIDATION_ERROR', validationError, 400))
    return
  }

  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) {
      updates[key] = body[key]
    }
  }
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error !== null) {
    const known = UPDATE_ERRORS[error.code]
    if (known !== undefined) {
      res.status(known.status).json(err(known.code, known.message, known.status))
      return
    }
    res.status(500).json(err('UPDATE_FAILED', 'Failed to update profile.', 500))
    return
  }

  res.status(200).json(ok({ updated: Object.keys(updates).filter((k) => k !== 'updated_at') }))
}

const handleDelete = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const body = (req.body ?? {}) as Record<string, unknown>
  if (body.confirm !== true) {
    res.status(400).json(err('CONFIRMATION_REQUIRED', 'Request body must include confirm: true.', 400))
    return
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing service role configuration.', 500))
    return
  }

  const adminClient = createClient(url, serviceRoleKey)
  const { error } = await adminClient.auth.admin.deleteUser(auth.user.id)

  if (error !== null) {
    res.status(500).json(err('DELETE_FAILED', 'Failed to delete account.', 500))
    return
  }

  res.status(200).json(ok({ deleted: true }))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  switch (req.method) {
    case 'GET':
      await handleGet(req, res)
      return
    case 'PATCH':
      await handlePatch(req, res)
      return
    case 'DELETE':
      await handleDelete(req, res)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
