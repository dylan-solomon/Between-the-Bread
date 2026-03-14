import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../_lib/supabase.js'
import { ok, err } from '../../_lib/response.js'

type SharedSandwichRecord = {
  hash: string
  name: string
  composition: unknown
  expires_at: string | null
  created_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
    return
  }

  const hash = typeof req.query.hash === 'string' ? req.query.hash : undefined

  if (hash === undefined) {
    res.status(400).json(err('MISSING_HASH', 'Hash parameter is required.', 400))
    return
  }

  const { data, error } = await supabase
    .from('shared_sandwiches')
    .select('hash, name, composition, expires_at, created_at')
    .eq('hash', hash)
    .single()

  if (error !== null) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST116') {
      res.status(404).json(err('NOT_FOUND', 'Sandwich not found.', 404))
    } else {
      res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch sandwich.', 500))
    }
    return
  }

  const record = data as unknown as SharedSandwichRecord

  if (record.expires_at !== null && new Date(record.expires_at) < new Date()) {
    res.status(404).json(err('EXPIRED', 'This sandwich link has expired.', 404))
    return
  }

  res.status(200).json(ok(record))
}
