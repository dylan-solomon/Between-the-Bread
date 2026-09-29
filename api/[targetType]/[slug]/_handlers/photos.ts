import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../../_lib/response.js'
import { authenticateRequest } from '../../../_lib/auth.js'
import { createClient } from '@supabase/supabase-js'

const VALID_TARGET_TYPES = ['database', 'community'] as const
type TargetType = (typeof VALID_TARGET_TYPES)[number]

const BUCKET = 'user-photos'
const SIGNED_URL_EXPIRY_SECONDS = 3600
const MAX_CAPTION_LENGTH = 100

const isValidTargetType = (value: unknown): value is TargetType =>
  typeof value === 'string' && (VALID_TARGET_TYPES as readonly string[]).includes(value)

type Photo = {
  id: string
  user_id: string
  storage_path: string
  caption: string | null
  created_at: string
}

type PhotoWithSignedUrl = Omit<Photo, 'storage_path'> & { signed_url: string | null }

const handleGet = async (req: VercelRequest, res: VercelResponse, targetType: TargetType): Promise<void> => {
  const { target_id, limit: limitStr, offset: offsetStr } = req.query as Record<string, string | undefined>

  if (typeof target_id !== 'string' || target_id.trim() === '') {
    res.status(400).json(err('MISSING_TARGET_ID', 'target_id is required.', 400))
    return
  }

  const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 50)
  const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0)

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    res.status(500).json(err('CONFIG_ERROR', 'Missing Supabase configuration.', 500))
    return
  }
  const supabase = createClient(url, key)

  const { data, error, count } = await supabase
    .from('photos')
    .select('id, user_id, storage_path, caption, created_at', { count: 'exact' })
    .eq('target_type', targetType)
    .eq('target_id', target_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch photos.', 500))
    return
  }

  const photos = data as Photo[]

  if (photos.length === 0) {
    res.status(200).json(ok<PhotoWithSignedUrl[]>([], { total_count: count ?? 0, limit, offset }))
    return
  }

  const signedUrlResult = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(photos.map((p) => p.storage_path), SIGNED_URL_EXPIRY_SECONDS)

  if (signedUrlResult.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to generate photo URLs.', 500))
    return
  }

  const signedUrlsByPath = new Map<string, string | null>()
  for (const entry of signedUrlResult.data as { path: string; signedUrl: string | null }[]) {
    signedUrlsByPath.set(entry.path, entry.signedUrl)
  }

  const withSignedUrls: PhotoWithSignedUrl[] = photos.map(({ storage_path, ...photo }) => ({
    ...photo,
    signed_url: signedUrlsByPath.get(storage_path) ?? null,
  }))

  res.status(200).json(ok(withSignedUrls, { total_count: count ?? 0, limit, offset }))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, targetType: TargetType): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>
  const { target_id, storage_path, caption } = body

  if (typeof target_id !== 'string' || target_id.trim() === '') {
    res.status(400).json(err('MISSING_TARGET_ID', 'target_id is required.', 400))
    return
  }

  if (typeof storage_path !== 'string' || storage_path.trim() === '') {
    res.status(400).json(err('MISSING_STORAGE_PATH', 'storage_path is required.', 400))
    return
  }

  const trimmedCaption = typeof caption === 'string' ? caption.trim() : ''
  if (trimmedCaption.length > MAX_CAPTION_LENGTH) {
    res.status(400).json(err('INVALID_CAPTION', `caption must be at most ${String(MAX_CAPTION_LENGTH)} characters.`, 400))
    return
  }

  const { data, error } = await supabase
    .from('photos')
    .insert({
      user_id: user.id,
      target_type: targetType,
      target_id,
      storage_path,
      caption: trimmedCaption === '' ? null : trimmedCaption,
      is_approved: false,
    })
    .select('id, user_id, target_type, target_id, storage_path, caption, is_approved, created_at')
    .single()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to create photo record.', 500))
    return
  }

  res.status(201).json(ok(data))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { targetType } = req.query as Record<string, string | undefined>

  if (!isValidTargetType(targetType)) {
    res.status(400).json(err('INVALID_TARGET_TYPE', 'targetType must be "database" or "community".', 400))
    return
  }

  switch (req.method) {
    case 'GET':
      await handleGet(req, res, targetType)
      return
    case 'POST':
      await handlePost(req, res, targetType)
      return
    default:
      res.status(405).json(err('METHOD_NOT_ALLOWED', 'Method not allowed.', 405))
  }
}
