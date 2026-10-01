import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../_lib/response.js'
import { authenticateAdminRequest } from '../_lib/adminAuth.js'
import type { AdminAuthResult } from '../_lib/adminAuth.js'
import { ADMIN_SANDWICH_COLUMNS } from '../_lib/sandwichColumns.js'
import { parseSandwichInput } from '../_lib/sandwichInput.js'

const DUPLICATE_KEY = '23505'

const handleGet = async (res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const { data, error } = await auth.supabase
    .from('sandwich_database')
    .select(ADMIN_SANDWICH_COLUMNS)
    .order('name')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch sandwiches.', 500))
    return
  }

  res.status(200).json(ok(data))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, auth: AdminAuthResult): Promise<void> => {
  const parsed = parseSandwichInput(req.body, 'create')
  if (!parsed.ok) {
    res.status(400).json(err('INVALID_INPUT', parsed.message, 400))
    return
  }

  const { data, error } = await auth.supabase
    .from('sandwich_database')
    .insert(parsed.value)
    .select(ADMIN_SANDWICH_COLUMNS)
    .single()

  if (error !== null) {
    const duplicate = (error as { code?: string }).code === DUPLICATE_KEY
    res.status(duplicate ? 409 : 500).json(
      duplicate
        ? err('SLUG_TAKEN', 'A sandwich with that slug already exists.', 409)
        : err('INTERNAL_ERROR', 'Failed to create sandwich.', 500),
    )
    return
  }

  res.status(201).json(ok(data))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const auth = await authenticateAdminRequest(req, res)
  if (auth === null) return

  if (req.method === 'GET') {
    await handleGet(res, auth)
    return
  }

  await handlePost(req, res, auth)
}
