import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { ok, err } from '../_lib/response.js'

const VALID_COST_CONTEXTS = ['retail', 'restaurant']
const VALID_DIETARY_TAGS = ['dairy_free', 'gluten_free', 'vegan', 'vegetarian']
const UPDATABLE_FIELDS = [
  'display_name',
  'dietary_filters',
  'smart_mode_default',
  'double_protein',
  'double_cheese',
  'cost_context',
] as const

const authenticateRequest = async (req: VercelRequest, res: VercelResponse) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(err('UNAUTHORIZED', 'Missing or invalid authorization header.', 401))
    return null
  }

  const token = authHeader.slice(7)
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing Supabase configuration.', 500))
    return null
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error !== null || user === null) {
    res.status(401).json(err('UNAUTHORIZED', 'Invalid or expired session.', 401))
    return null
  }

  return { supabase, user }
}

const handleGet = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth

  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, dietary_filters, smart_mode_default, double_protein, double_cheese, cost_context, created_at, updated_at')
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
    if (!Array.isArray(filters) || filters.some((f) => !VALID_DIETARY_TAGS.includes(f as string))) {
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
    res.status(500).json(err('UPDATE_FAILED', 'Failed to update profile.', 500))
    return
  }

  res.status(200).json(ok({ updated: Object.keys(updates).filter((k) => k !== 'updated_at') }))
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
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
