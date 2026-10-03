import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ok, err } from '../../_lib/response.js'
import { authenticateRequest } from '../../_lib/auth.js'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const VALID_TARGET_TYPES = ['database', 'community', 'blog'] as const
type TargetType = (typeof VALID_TARGET_TYPES)[number]

const VALID_SORTS = ['newest', 'oldest', 'best', 'hot'] as const
type Sort = (typeof VALID_SORTS)[number]

const MAX_BODY_LENGTH = 500

const isValidTargetType = (value: unknown): value is TargetType =>
  typeof value === 'string' && (VALID_TARGET_TYPES as readonly string[]).includes(value)

const resolveSort = (value: unknown): Sort =>
  typeof value === 'string' && (VALID_SORTS as readonly string[]).includes(value) ? (value as Sort) : 'newest'

type Comment = {
  id: string
  user_id: string
  body: string
  parent_id: string | null
  like_count: number
  reply_count: number
  created_at: string
}

type TopLevelRow = Comment & { total_count: number }

type NamedComment = Comment & { username: string | null; author_is_admin: boolean }

type Author = { username: string; isAdmin: boolean }

type CommentWithReplies = NamedComment & { replies: NamedComment[] }

const isUsernameRow = (value: unknown): value is { id: string; username: string; is_admin?: unknown } =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'username' in value &&
  typeof value.username === 'string'

const loadAuthors = async (supabase: SupabaseClient, userIds: string[]): Promise<Map<string, Author>> => {
  const response = await supabase.rpc('public_usernames', { p_ids: [...new Set(userIds)] })
  const data: unknown = response.data
  if (response.error !== null || !Array.isArray(data)) return new Map()
  return new Map(
    data.filter(isUsernameRow).map((row) => [row.id, { username: row.username, isAdmin: row.is_admin === true }]),
  )
}

const handleGet = async (req: VercelRequest, res: VercelResponse, targetType: TargetType): Promise<void> => {
  const { target_id, sort, limit: limitStr, offset: offsetStr } = req.query as Record<string, string | undefined>

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

  const topLevelResult = await supabase.rpc('list_top_level_comments', {
    p_target_type: targetType,
    p_target_id: target_id,
    p_sort: resolveSort(sort),
    p_limit: limit,
    p_offset: offset,
  })

  if (topLevelResult.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch comments.', 500))
    return
  }

  const topLevelRows = topLevelResult.data as TopLevelRow[]
  const totalCount = topLevelRows.length > 0 ? topLevelRows[0].total_count : 0
  const topLevelComments: Comment[] = topLevelRows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    parent_id: row.parent_id,
    like_count: row.like_count,
    reply_count: row.reply_count,
    created_at: row.created_at,
  }))

  if (topLevelComments.length === 0) {
    res.status(200).json(ok<CommentWithReplies[]>([], { total_count: totalCount, limit, offset }))
    return
  }

  const { data: replies, error: repliesError } = await supabase
    .from('comments')
    .select('id, user_id, target_type, target_id, parent_id, body, like_count, reply_count, created_at')
    .in('parent_id', topLevelComments.map((c) => c.id))
    .order('created_at', { ascending: true })

  if (repliesError !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to fetch comment replies.', 500))
    return
  }

  const replyRows = replies as Comment[]
  const authors = await loadAuthors(supabase, [...topLevelComments, ...replyRows].map((c) => c.user_id))
  const named = (comment: Comment): NamedComment => {
    const author = authors.get(comment.user_id)
    return { ...comment, username: author?.username ?? null, author_is_admin: author?.isAdmin ?? false }
  }

  const repliesByParent = new Map<string, NamedComment[]>()
  for (const reply of replyRows) {
    const parentId = reply.parent_id
    if (parentId === null) continue
    const existing = repliesByParent.get(parentId) ?? []
    repliesByParent.set(parentId, [...existing, named(reply)])
  }

  const nested: CommentWithReplies[] = topLevelComments.map((comment) => ({
    ...named(comment),
    replies: repliesByParent.get(comment.id) ?? [],
  }))

  res.status(200).json(ok(nested, { total_count: totalCount, limit, offset }))
}

const handlePost = async (req: VercelRequest, res: VercelResponse, targetType: TargetType): Promise<void> => {
  const auth = await authenticateRequest(req, res)
  if (auth === null) return

  const { supabase, user } = auth
  const body = (req.body ?? {}) as Record<string, unknown>
  const { target_id, body: commentBody, parent_id } = body

  if (typeof target_id !== 'string' || target_id.trim() === '') {
    res.status(400).json(err('MISSING_TARGET_ID', 'target_id is required.', 400))
    return
  }

  const trimmedBody = typeof commentBody === 'string' ? commentBody.trim() : ''
  if (trimmedBody === '' || trimmedBody.length > MAX_BODY_LENGTH) {
    res.status(400).json(err('INVALID_BODY', `body must be 1-${String(MAX_BODY_LENGTH)} characters.`, 400))
    return
  }

  const replyParentId = typeof parent_id === 'string' ? parent_id : null

  const profile = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single<{ username: string | null; is_admin: boolean }>()
  if (profile.error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to create comment.', 500))
    return
  }
  const { username, is_admin: authorIsAdmin } = profile.data
  if (username === null) {
    res.status(403).json(err('USERNAME_REQUIRED', 'Choose a username before commenting.', 403))
    return
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      user_id: user.id,
      target_type: targetType,
      target_id,
      parent_id: replyParentId,
      body: trimmedBody,
    })
    .select('id, user_id, target_type, target_id, parent_id, body, like_count, reply_count, created_at')
    .single()

  if (error !== null) {
    res.status(500).json(err('INTERNAL_ERROR', 'Failed to create comment.', 500))
    return
  }

  if (replyParentId !== null) {
    // Best-effort: the comment itself was created successfully either way.
    await supabase.rpc('adjust_comment_reply_count', { p_comment_id: replyParentId, p_delta: 1 })
  }

  res.status(201).json(ok({ ...data, username, author_is_admin: authorIsAdmin }))
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { targetType } = req.query as Record<string, string | undefined>

  if (!isValidTargetType(targetType)) {
    res.status(400).json(err('INVALID_TARGET_TYPE', 'targetType must be "database", "community" or "blog".', 400))
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
