import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  }),
}))

import handler from '../[slug].js'

type Result = { data: unknown; error: unknown }

const makeReq = (overrides: Partial<VercelRequest> = {}): VercelRequest =>
  ({
    method: 'PATCH',
    headers: { authorization: 'Bearer valid-token' },
    body: {},
    query: { slug: 'reuben' },
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

const stubRow = { id: 's1', name: 'Reuben', slug: 'reuben', published: true }

type TableOptions = { lookup?: Result; deleteResult?: Result; photos?: Result; removeResult?: Result }

const setupSandwichTable = (result: Result, options: TableOptions = {}) => {
  const updates: Record<string, unknown>[] = []
  const filters: unknown[][] = []
  const deletes: unknown[][] = []
  const photoFilters: unknown[][] = []
  const events: string[] = []
  const selects: string[] = []
  const removed: { bucket: string; paths: string[] }[] = []
  mockStorageFrom.mockImplementation((bucket: string) => ({
    remove: (paths: string[]) => {
      events.push('remove-files')
      removed.push({ bucket, paths })
      return Promise.resolve(options.removeResult ?? { data: [], error: null })
    },
  }))
  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return profileBranch(true)
    if (table === 'photos') {
      const photosBuilder: Record<string, unknown> = {}
      photosBuilder.select = () => photosBuilder
      photosBuilder.eq = (...args: unknown[]) => {
        photoFilters.push(args)
        return photosBuilder
      }
      photosBuilder.then = (resolve: (value: Result) => unknown) =>
        Promise.resolve(options.photos ?? { data: [], error: null }).then(resolve)
      return photosBuilder
    }
    const builder: Record<string, unknown> = {}
    builder.update = (payload: Record<string, unknown>) => {
      updates.push(payload)
      return builder
    }
    builder.eq = (...args: unknown[]) => {
      filters.push(args)
      return builder
    }
    builder.select = (columns?: string) => {
      if (columns !== undefined) selects.push(columns)
      return builder
    }
    builder.single = () => Promise.resolve(result)
    builder.maybeSingle = () => Promise.resolve(options.lookup ?? result)
    builder.delete = () => {
      const deleteBuilder: Record<string, unknown> = {}
      deleteBuilder.eq = (...args: unknown[]) => {
        events.push('delete-row')
        deletes.push(args)
        return Promise.resolve(options.deleteResult ?? { data: null, error: null })
      }
      return deleteBuilder
    }
    return builder
  })
  return { updates, filters, deletes, photoFilters, removed, events, selects }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
  mockGetUser.mockResolvedValue({ data: { user: validUser }, error: null })
})

describe('PATCH /api/admin/database/:slug', () => {
  it('updates the entry identified by the url slug', async () => {
    const { updates, filters } = setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { description: 'New description.' } }), res)

    expect(res._status).toBe(200)
    expect((res._json as { data: unknown }).data).toEqual(stubRow)
    expect(updates[0]).toMatchObject({ description: 'New description.' })
    expect(filters).toContainEqual(['slug', 'reuben'])
  })

  it('publishes and unpublishes through the published flag', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })

    await handler(makeReq({ body: { published: true } }), makeRes())

    expect(updates[0]).toMatchObject({ published: true })
  })

  it('records when the entry was last updated', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })

    await handler(makeReq({ body: { name: 'Reuben Sandwich' } }), makeRes())

    expect(typeof updates[0]?.updated_at).toBe('string')
  })

  it('updates alternative names', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { alternative_names: ['Cheese toastie'] } }), res)

    expect(res._status).toBe(200)
    expect(updates[0]).toMatchObject({ alternative_names: ['Cheese toastie'] })
  })

  it('allows clearing all alternative names', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })

    await handler(makeReq({ body: { alternative_names: [] } }), makeRes())

    expect(updates[0]).toMatchObject({ alternative_names: [] })
  })

  it('returns the alternative names of the saved entry', async () => {
    const { selects } = setupSandwichTable({ data: stubRow, error: null })

    await handler(makeReq({ body: { name: 'X' } }), makeRes())

    expect(selects.some((columns) => columns.includes('alternative_names'))).toBe(true)
  })

  it('ignores fields that are not editable', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })

    await handler(makeReq({ body: { name: 'Reuben', id: 'other', avg_rating: 5, rating_count: 99 } }), makeRes())

    expect(updates[0]).not.toHaveProperty('id')
    expect(updates[0]).not.toHaveProperty('avg_rating')
    expect(updates[0]).not.toHaveProperty('rating_count')
  })

  it('returns 400 when nothing editable is provided', async () => {
    setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { avg_rating: 5 } }), res)

    expect(res._status).toBe(400)
  })

  it.each([
    ['an empty name', { name: '' }],
    ['a malformed slug', { slug: 'Not A Slug' }],
    ['an unknown region', { origin_region: 'Atlantis' }],
    ['canonical ingredients that are not an object', { canonical_ingredients: 'rye' }],
    ['a non-boolean published flag', { published: 1 }],
    ['an unsafe image url', { image_url: 'javascript:alert(1)' }],
    ['alternative names that are not a list', { alternative_names: 'Toastie' }],
    ['a blank alternative name', { alternative_names: [''] }],
  ])('rejects %s with 400', async (_label, body) => {
    setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body }), res)

    expect(res._status).toBe(400)
  })

  it('allows clearing optional fields', async () => {
    const { updates } = setupSandwichTable({ data: stubRow, error: null })
    const res = makeRes()

    await handler(makeReq({ body: { image_url: null, origin_region: null } }), res)

    expect(res._status).toBe(200)
    expect(updates[0]).toMatchObject({ image_url: null, origin_region: null })
  })

  it('returns 404 when the entry does not exist', async () => {
    setupSandwichTable({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'X' } }), res)

    expect(res._status).toBe(404)
  })

  it('returns 409 when changing to a slug that is taken', async () => {
    setupSandwichTable({ data: null, error: { code: '23505', message: 'duplicate key' } })
    const res = makeRes()

    await handler(makeReq({ body: { slug: 'taken' } }), res)

    expect(res._status).toBe(409)
  })

  it('returns 500 on other database errors', async () => {
    setupSandwichTable({ data: null, error: { message: 'db down' } })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'X' } }), res)

    expect(res._status).toBe(500)
  })
})

describe('DELETE /api/admin/database/:slug', () => {
  it('soft deletes by unpublishing instead of removing the row', async () => {
    const { updates, filters } = setupSandwichTable({ data: { ...stubRow, published: false }, error: null })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE', body: undefined }), res)

    expect(res._status).toBe(200)
    expect(updates[0]).toMatchObject({ published: false })
    expect(filters).toContainEqual(['slug', 'reuben'])
  })

  it('returns 404 when the entry does not exist', async () => {
    setupSandwichTable({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = makeRes()

    await handler(makeReq({ method: 'DELETE', body: undefined }), res)

    expect(res._status).toBe(404)
  })
})

describe('DELETE /api/admin/database/:slug?permanent=true', () => {
  const permanentDelete = () => makeReq({ method: 'DELETE', body: undefined, query: { slug: 'reuben', permanent: 'true' } })

  it('permanently deletes an unpublished entry', async () => {
    const { deletes, updates } = setupSandwichTable(
      { data: null, error: null },
      { lookup: { data: { id: 's1', published: false }, error: null } },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(200)
    expect(deletes).toEqual([['slug', 'reuben']])
    expect(updates).toHaveLength(0)
  })

  it('refuses to delete a published entry', async () => {
    const { deletes } = setupSandwichTable(
      { data: null, error: null },
      { lookup: { data: { id: 's1', published: true }, error: null } },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(409)
    expect(deletes).toHaveLength(0)
  })

  it('returns 404 when the entry does not exist', async () => {
    const { deletes } = setupSandwichTable({ data: null, error: null }, { lookup: { data: null, error: null } })
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(404)
    expect(deletes).toHaveLength(0)
  })

  it('returns 500 when the lookup fails', async () => {
    setupSandwichTable({ data: null, error: null }, { lookup: { data: null, error: { message: 'db down' } } })
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(500)
  })

  it('returns 500 when the delete fails', async () => {
    setupSandwichTable(
      { data: null, error: null },
      { lookup: { data: { id: 's1', published: false }, error: null }, deleteResult: { data: null, error: { message: 'db down' } } },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(500)
  })

  it('removes the sandwich photo files from storage before deleting the row', async () => {
    const { removed, events, photoFilters } = setupSandwichTable(
      { data: null, error: null },
      {
        lookup: { data: { id: 's1', published: false }, error: null },
        photos: { data: [{ storage_path: 'u1/a.jpg' }, { storage_path: 'u2/b.png' }], error: null },
      },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(200)
    expect(removed).toEqual([{ bucket: 'user-photos', paths: ['u1/a.jpg', 'u2/b.png'] }])
    expect(events).toEqual(['remove-files', 'delete-row'])
    expect(photoFilters).toContainEqual(['target_type', 'database'])
    expect(photoFilters).toContainEqual(['target_id', 's1'])
  })

  it('does not touch storage when the sandwich has no photos', async () => {
    const { removed } = setupSandwichTable(
      { data: null, error: null },
      { lookup: { data: { id: 's1', published: false }, error: null } },
    )

    await handler(permanentDelete(), makeRes())

    expect(removed).toHaveLength(0)
  })

  it('keeps the entry when the photo files cannot be removed', async () => {
    const { deletes } = setupSandwichTable(
      { data: null, error: null },
      {
        lookup: { data: { id: 's1', published: false }, error: null },
        photos: { data: [{ storage_path: 'u1/a.jpg' }], error: null },
        removeResult: { data: null, error: { message: 'storage down' } },
      },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(500)
    expect(deletes).toHaveLength(0)
  })

  it('keeps the entry when its photos cannot be listed', async () => {
    const { deletes, removed } = setupSandwichTable(
      { data: null, error: null },
      {
        lookup: { data: { id: 's1', published: false }, error: null },
        photos: { data: null, error: { message: 'db down' } },
      },
    )
    const res = makeRes()

    await handler(permanentDelete(), res)

    expect(res._status).toBe(500)
    expect(deletes).toHaveLength(0)
    expect(removed).toHaveLength(0)
  })

  it('still only unpublishes when permanent is not requested', async () => {
    const { deletes, updates } = setupSandwichTable({ data: { ...stubRow, published: false }, error: null })

    await handler(makeReq({ method: 'DELETE', body: undefined }), makeRes())

    expect(deletes).toHaveLength(0)
    expect(updates[0]).toMatchObject({ published: false })
  })
})

describe('access control', () => {
  it('returns 403 when the user is not an admin', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBranch(false)
      throw new Error('should not query sandwich_database')
    })
    const res = makeRes()

    await handler(makeReq({ body: { name: 'X' } }), res)

    expect(res._status).toBe(403)
  })

  it('returns 405 for unsupported methods', async () => {
    const res = makeRes()

    await handler(makeReq({ method: 'POST' }), res)

    expect(res._status).toBe(405)
  })
})
