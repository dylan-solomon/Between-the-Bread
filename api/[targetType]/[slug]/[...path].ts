import type { VercelRequest, VercelResponse } from '@vercel/node'
import { err } from '../../_lib/response.js'
import ratingsHandler from './_handlers/ratings.js'
import commentsHandler from './_handlers/comments.js'
import commentByIdHandler from './_handlers/commentById.js'
import commentLikeHandler from './_handlers/commentLike.js'
import photosHandler from './_handlers/photos.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const { path } = req.query as { path?: string[] }
  const segments = path ?? []
  const [resource, id, action] = segments

  if (resource === 'ratings' && segments.length === 1) {
    await ratingsHandler(req, res)
    return
  }

  if (resource === 'comments') {
    if (segments.length === 1) {
      await commentsHandler(req, res)
      return
    }
    if (segments.length === 2) {
      req.query.id = id
      await commentByIdHandler(req, res)
      return
    }
    if (segments.length === 3 && action === 'like') {
      req.query.id = id
      await commentLikeHandler(req, res)
      return
    }
  }

  if (resource === 'photos' && segments.length === 1) {
    await photosHandler(req, res)
    return
  }

  res.status(404).json(err('NOT_FOUND', 'Route not found.', 404))
}
