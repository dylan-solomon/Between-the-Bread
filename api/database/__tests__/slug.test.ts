import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import handler from '../[slug].js'

type Result = { data?: unknown; count?: number | null; error: unknown }

const stubSandwich = {
  id: 'sandwich-1',
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef and sauerkraut on rye.',
  history: 'Origin story.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }] },
  dietary_tags: [],
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
}

const setupTables = ({
  sandwich = { data: stubSandwich, error: null } as Result,
  comments = { count: 3, error: null } as Result,
  photos = { count: 2, error: null } as Result,
} = {}) => {
  const seen: { table: string; eq: unknown[][]; select: string[] }[] = []
  mockFrom.mockImplementation((table: string) => {
    const record = { table, eq: [] as unknown[][], select: [] as string[] }
    seen.push(record)
    const result = table === 'sandwich_database' ? sandwich : table === 'comments' ? comments : photos
    const builder: Record<string, unknown> = {}
    builder.select = (columns?: string) => {
      if (columns !== undefined) record.select.push(columns)
      return builder
    }
    builder.eq = (...args: unknown[]) => {
      record.eq.push(args)
      return builder
    }
    builder.maybeSingle = () => Promise.resolve(result)
    builder.then = (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve)
    return builder
  })
  return seen
}

const makeReq = (method = 'GET', slug: unknown = 'reuben'): VercelRequest =>
  ({ method, query: { slug } }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const statusOf = (res: VercelResponse): unknown => vi.mocked(res.status).mock.calls[0]?.[0]
const bodyOf = (res: VercelResponse): { data: unknown } => vi.mocked(res.json).mock.calls[0]?.[0] as { data: unknown }

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/database/:slug', () => {
  it('returns the entry with its rating, comment count and photo count', async () => {
    setupTables()
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(200)
    expect(bodyOf(res).data).toEqual({ ...stubSandwich, comment_count: 3, photo_count: 2 })
  })

  it('includes the entry\'s alternative names', async () => {
    const seen = setupTables()

    await handler(makeReq(), makeRes())

    expect(seen.find((s) => s.table === 'sandwich_database')?.select[0]).toContain('alternative_names')
  })

  it('looks the entry up by slug', async () => {
    const seen = setupTables()

    await handler(makeReq(), makeRes())

    expect(seen.find((s) => s.table === 'sandwich_database')?.eq).toContainEqual(['slug', 'reuben'])
  })

  it('counts only approved photos for this sandwich', async () => {
    const seen = setupTables()

    await handler(makeReq(), makeRes())

    const photoFilters = seen.find((s) => s.table === 'photos')?.eq
    expect(photoFilters).toContainEqual(['target_type', 'database'])
    expect(photoFilters).toContainEqual(['target_id', 'sandwich-1'])
    expect(photoFilters).toContainEqual(['is_approved', true])
  })

  it('counts comments for this sandwich', async () => {
    const seen = setupTables()

    await handler(makeReq(), makeRes())

    const commentFilters = seen.find((s) => s.table === 'comments')?.eq
    expect(commentFilters).toContainEqual(['target_type', 'database'])
    expect(commentFilters).toContainEqual(['target_id', 'sandwich-1'])
  })

  it('returns 404 when the entry does not exist or is unpublished', async () => {
    setupTables({ sandwich: { data: null, error: null } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(404)
  })

  it('returns 404 for a malformed slug without querying', async () => {
    setupTables()
    const res = makeRes()

    await handler(makeReq('GET', 'Not A Slug!'), res)

    expect(statusOf(res)).toBe(404)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns 500 when the entry lookup fails', async () => {
    setupTables({ sandwich: { data: null, error: { message: 'db down' } } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(500)
  })

  it('returns 500 when a count query fails', async () => {
    setupTables({ photos: { count: null, error: { message: 'db down' } } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(statusOf(res)).toBe(500)
  })

  it('returns 405 for non-GET requests', async () => {
    const res = makeRes()

    await handler(makeReq('POST'), res)

    expect(statusOf(res)).toBe(405)
  })
})
