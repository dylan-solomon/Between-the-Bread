import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '../../_lib/response.js'

const handleGet = async (res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const { data, error } = await supabase.from('config').select('key, value')

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch config.', 500))
    return
  }

  res.status(200).json(ok(data))
}

const handlePatch = async (req: VercelRequest, res: VercelResponse, supabase: SupabaseClient): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const { key } = body

  if (typeof key !== 'string' || key.trim() === '') {
    res.status(400).json(err('MISSING_KEY', 'key is required.', 400))
    return
  }

  if (!('value' in body)) {
    res.status(400).json(err('MISSING_VALUE', 'value is required.', 400))
    return
  }

  const { data, error } = await supabase
    .from('config')
    .update({ value: body.value })
    .eq('key', key)
    .select('key, value')
    .single()

  if (error !== null) {
    res.status(404).json(err('CONFIG_KEY_NOT_FOUND', 'Config key not found.', 404))
    return
  }

  res.status(200).json(ok(data))
}

export default async function handleConfig(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
): Promise<void> {
  switch (req.method) {
    case 'GET':
      await handleGet(res, supabase)
      return
    case 'PATCH':
      await handlePatch(req, res, supabase)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
