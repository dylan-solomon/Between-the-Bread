import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import handler from '../database.js'

type Result = { data: unknown; error: unknown }

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
    body: undefined,
    query: {},
    ...overrides,
  }) as unknown as VercelRequest

const makeRes = (): VercelResponse & { _status: number; _json: unknown } => {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) { res._status = code; return res },
    json(body: unknown) { res._json = body; return res },
  }
  return res as unknown as VercelResponse & { _status: number; _json: unknown }
}

const validUser = { id: 'admin-1', email: 'admin@example.com' }
const profileBranch = (isAdmin: boolean) => ({
  select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { is_admin: isAdmin }, error: null }) }) }),
})

const stubRow = { id: 's1', name: 'Reuben', slug: 'reuben', published: false }

const validBody = {
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef and sauerkraut on rye.',
  history: 'Origin story.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }] },
  dietary_tags: [],
  image_url: 'https://example.com/reuben.jpg',
}

const setupSandwichTable = (result: Result) => {
  const inserted: unknown[] = []
  const tables: string[] = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileBranch(true)
    tables.push(table)
    const builder: Record<string, unknown> = {}
    builder.select = () => builder
    builder.order = () => Promise.resolve(result)
    builder.insert = (payload: unknown) => {
      inserted.push(payload)
      return builder
    }
    builder.single = () => Promise.resolve(result)
    return builder
  })
  return { inserted, tables }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('GET /api/admin/database', () => {
  it('returns every entry including unpublished ones', async () => {
    const { tables } = setupSandwichTable({ data: [stubRow], error: null })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown[] }).data).toEqual([stubRow])
    expect(tables).toEqual(['sandwich_database'])
  })

  it('returns 500 when the query fails', async () => {
    setupSandwichTable({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(500)
  })

  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBranch(false)
      throw new Error('should not query sandwich_database')
    })
    const res = makeRes()

    await handler(makeReq(), res)

    expect(res._status).toBe(403)
  })

  it('returns 401 without an authorization header', async () => {
    const res = makeRes()

    await handler(makeReq({ headers: {} }), res)

    expect(res._status).toBe(401)
  })
})

describe('POST /api/admin/database', () => {
  const post = (body: unknown) => makeReq({ method: 'POST', body })

  it('creates an unpublished entry and returns 201', async () => {
    const { inserted } = setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(post(validBody), res)

    expect(res._status).toBe(201)
    expect((res._json as { data: unknown }).data).toEqual(stubRow)
    expect(inserted[0]).toMatchObject({ name: 'Reuben', slug: 'reuben', published: false })
  })

  it('only writes known fields', async () => {
    const { inserted } = setupSandwichTable({ data: stubRow, error: null })

    await handler(post({ ...validBody, id: 'forced-id', avg_rating: 5, rating_count: 99 }), makeRes())

    expect(inserted[0]).not.toHaveProperty('id')
    expect(inserted[0]).not.toHaveProperty('avg_rating')
    expect(inserted[0]).not.toHaveProperty('rating_count')
  })

  it('accepts the supported dietary tags', async () => {
    const { inserted } = setupSandwichTable({ data: stubRow, error: null })
    const tags = ['pescatarian', 'contains_pork', 'contains_shellfish', 'contains_peanuts']
    const res = makeRes()

    await handler(post({ ...validBody, dietary_tags: tags }), res)

    expect(res._status).toBe(201)
    expect(inserted[0]).toMatchObject({ dietary_tags: tags })
  })

  it('accepts a minimal entry with only a name and slug', async () => {
    const { inserted } = setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(post({ name: 'Reuben', slug: 'reuben' }), res)

    expect(res._status).toBe(201)
    expect(inserted[0]).toMatchObject({ canonical_ingredients: {}, dietary_tags: [] })
  })

  it.each([
    ['a missing name', { ...validBody, name: '' }],
    ['a missing slug', { ...validBody, slug: undefined }],
    ['a slug with spaces or capitals', { ...validBody, slug: 'Not A Slug' }],
    ['an unknown region', { ...validBody, origin_region: 'Atlantis' }],
    ['canonical ingredients that are not an object', { ...validBody, canonical_ingredients: ['Rye'] }],
    ['dietary tags that are not strings', { ...validBody, dietary_tags: [1, 2] }],
    ['an unsupported dietary tag', { ...validBody, dietary_tags: ['vegan', 'keto'] }],
    ['an image url that is not http(s)', { ...validBody, image_url: 'javascript:alert(1)' }],
    ['a non-boolean published flag', { ...validBody, published: 'yes' }],
  ])('rejects %s with 400', async (_label, body) => {
    setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(post(body), res)

    expect(res._status).toBe(400)
  })

  it('returns 409 when the slug is already taken', async () => {
    setupSandwichTable({ data: null, error: { code: '23505', message: 'duplicate key' } })
    const res = makeRes()

    await handler(post(validBody), res)

    expect(res._status).toBe(409)
  })

  it('returns 500 when the insert fails', async () => {
    setupSandwichTable({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(post(validBody), res)

    expect(res._status).toBe(500)
  })
})

describe('other methods', () => {
  it('returns 405 for PUT', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'PUT' }), res)

    expect(res._status).toBe(405)
  })
})
