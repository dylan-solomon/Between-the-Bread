import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockRatings, mockComments, mockCommentById, mockCommentLike, mockPhotos } = vi.hoisted(() => ({
  mockRatings: vi.fn(),
  mockComments: vi.fn(),
  mockCommentById: vi.fn(),
  mockCommentLike: vi.fn(),
  mockPhotos: vi.fn(),
}))

vi.mock('../_handlers/ratings.js', () => ({ default: mockRatings }))
vi.mock('../_handlers/comments.js', () => ({ default: mockComments }))
vi.mock('../_handlers/commentById.js', () => ({ default: mockCommentById }))
vi.mock('../_handlers/commentLike.js', () => ({ default: mockCommentLike }))
vi.mock('../_handlers/photos.js', () => ({ default: mockPhotos }))

import handler from '../[...path].js'

const makeReq = (path: string[], overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: {},
    body: undefined,
    query: { targetType: 'database', slug: 'reuben', path },
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code
      return res
    },
    json(body: unknown) {
      res._json = body
      return res
    },
    end() {
      return res
    },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('api/[targetType]/[slug]/[...path] dispatcher', () => {
  it('routes ["ratings"] to the ratings handler', async () => {
    const res = makeRes()
    await handler(makeReq(['ratings']), res)
    expect(mockRatings).toHaveBeenCalledTimes(1)
  })

  it('routes ["comments"] to the comments handler', async () => {
    const res = makeRes()
    await handler(makeReq(['comments']), res)
    expect(mockComments).toHaveBeenCalledTimes(1)
  })

  it('routes ["comments", id] to the commentById handler and injects id onto the query', async () => {
    const req = makeReq(['comments', 'c1'])
    const res = makeRes()
    await handler(req, res)

    expect(mockCommentById).toHaveBeenCalledTimes(1)
    expect(req.query.id).toBe('c1')
  })

  it('routes ["comments", id, "like"] to the commentLike handler and injects id onto the query', async () => {
    const req = makeReq(['comments', 'c1', 'like'])
    const res = makeRes()
    await handler(req, res)

    expect(mockCommentLike).toHaveBeenCalledTimes(1)
    expect(req.query.id).toBe('c1')
  })

  it('routes ["photos"] to the photos handler', async () => {
    const res = makeRes()
    await handler(makeReq(['photos']), res)
    expect(mockPhotos).toHaveBeenCalledTimes(1)
  })

  it('returns 404 for an unrecognized resource', async () => {
    const res = makeRes()
    await handler(makeReq(['bogus']), res)
    expect(res._status).toBe(404)
  })

  it('returns 404 when the path is empty', async () => {
    const res = makeRes()
    await handler(makeReq([]), res)
    expect(res._status).toBe(404)
  })

  it('returns 404 for an unrecognized comment sub-action', async () => {
    const res = makeRes()
    await handler(makeReq(['comments', 'c1', 'notlike']), res)
    expect(res._status).toBe(404)
  })
})
