import { failureFrom } from './errors'
export type TargetType = 'database' | 'community'

export type CommentTargetType = TargetType | 'blog'

export type Comment = {
  id: string
  user_id: string
  username: string | null
  author_is_admin: boolean
  body: string
  parent_id: string | null
  like_count: number
  reply_count: number
  created_at: string
}

export type CommentWithReplies = Comment & { replies: Comment[] }

export type CommentSort = 'newest' | 'oldest' | 'best' | 'hot'

export type Photo = {
  id: string
  user_id: string
  caption: string | null
  created_at: string
  signed_url: string | null
}

type CommentsResponse = {
  data: CommentWithReplies[]
  meta: { total_count: number; limit: number; offset: number }
}

type PhotosResponse = {
  data: Photo[]
  meta: { total_count: number; limit: number; offset: number }
}

const authHeaders = (token: string): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

const basePath = (targetType: CommentTargetType, slug: string): string => `/api/${targetType}/${slug}`

export const submitRating = async (
  token: string,
  params: { targetType: TargetType; slug: string; targetId: string; score: number },
): Promise<{ id: string; score: number }> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/ratings`, window.location.origin).toString(),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ target_id: params.targetId, score: params.score }),
    },
  )
  if (!response.ok) throw await failureFrom(response, 'Failed to submit rating')
  return ((await response.json()) as { data: { id: string; score: number } }).data
}

export const fetchComments = async (
  params: { targetType: CommentTargetType; slug: string; targetId: string; sort?: CommentSort; limit?: number; offset?: number },
): Promise<CommentsResponse> => {
  const url = new URL(`${basePath(params.targetType, params.slug)}/comments`, window.location.origin)
  url.searchParams.set('target_id', params.targetId)
  if (params.sort !== undefined) url.searchParams.set('sort', params.sort)
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset))

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch comments: ${String(response.status)}`)
  return (await response.json()) as CommentsResponse
}

export const postComment = async (
  token: string,
  params: { targetType: CommentTargetType; slug: string; targetId: string; body: string; parentId?: string },
): Promise<Comment> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/comments`, window.location.origin).toString(),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ target_id: params.targetId, body: params.body, parent_id: params.parentId }),
    },
  )
  if (!response.ok) throw await failureFrom(response, 'Failed to post comment')
  return ((await response.json()) as { data: Comment }).data
}

export const deleteComment = async (
  token: string,
  params: { targetType: CommentTargetType; slug: string; id: string },
): Promise<void> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/comments/${params.id}`, window.location.origin).toString(),
    { method: 'DELETE', headers: authHeaders(token) },
  )
  if (!response.ok) throw new Error(`Failed to delete comment: ${String(response.status)}`)
}

export const likeComment = async (
  token: string,
  params: { targetType: CommentTargetType; slug: string; id: string },
): Promise<{ like_count: number }> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/comments/${params.id}/like`, window.location.origin).toString(),
    { method: 'POST', headers: authHeaders(token) },
  )
  if (!response.ok) throw new Error(`Failed to like comment: ${String(response.status)}`)
  return ((await response.json()) as { data: { like_count: number } }).data
}

export const unlikeComment = async (
  token: string,
  params: { targetType: CommentTargetType; slug: string; id: string },
): Promise<{ like_count: number }> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/comments/${params.id}/like`, window.location.origin).toString(),
    { method: 'DELETE', headers: authHeaders(token) },
  )
  if (!response.ok) throw new Error(`Failed to unlike comment: ${String(response.status)}`)
  return ((await response.json()) as { data: { like_count: number } }).data
}

export const fetchPhotos = async (
  params: { targetType: TargetType; slug: string; targetId: string; limit?: number; offset?: number },
): Promise<PhotosResponse> => {
  const url = new URL(`${basePath(params.targetType, params.slug)}/photos`, window.location.origin)
  url.searchParams.set('target_id', params.targetId)
  if (params.limit !== undefined) url.searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) url.searchParams.set('offset', String(params.offset))

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Failed to fetch photos: ${String(response.status)}`)
  return (await response.json()) as PhotosResponse
}

export const registerPhoto = async (
  token: string,
  params: { targetType: TargetType; slug: string; targetId: string; storagePath: string; caption?: string },
): Promise<Photo> => {
  const response = await fetch(
    new URL(`${basePath(params.targetType, params.slug)}/photos`, window.location.origin).toString(),
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ target_id: params.targetId, storage_path: params.storagePath, caption: params.caption }),
    },
  )
  if (!response.ok) throw await failureFrom(response, 'Failed to register photo')
  return ((await response.json()) as { data: Photo }).data
}
