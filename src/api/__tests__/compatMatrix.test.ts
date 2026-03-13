import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCompatMatrix } from '@/api/compatMatrix'
import type { CompatMatrixRow } from '@/types'

const stubRows: CompatMatrixRow[] = [
  { group_a: 'italian', group_b: 'mediterranean', affinity: 0.85 },
  { group_a: 'american', group_b: 'italian', affinity: 0.50 },
]

const makeApiResponse = (rows: CompatMatrixRow[] = stubRows) => ({
  data: rows,
  meta: { timestamp: '2026-03-05T12:00:00Z', row_count: rows.length },
})

beforeEach(() => { vi.restoreAllMocks() })

describe('fetchCompatMatrix', () => {
  it('returns an array of CompatMatrixRow objects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    }))

    const result = await fetchCompatMatrix()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('each row has group_a, group_b, and affinity', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    }))

    const result = await fetchCompatMatrix()
    expect(result[0]).toHaveProperty('group_a', 'italian')
    expect(result[0]).toHaveProperty('group_b', 'mediterranean')
    expect(result[0]).toHaveProperty('affinity', 0.85)
  })

  it('calls /api/compat-matrix', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse()),
    })
    vi.stubGlobal('fetch', mockFetch)

    await fetchCompatMatrix()
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('/api/compat-matrix')
  })

  it('throws when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }))

    await expect(fetchCompatMatrix()).rejects.toThrow('500')
  })

  it('returns empty array when data is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeApiResponse([])),
    }))

    const result = await fetchCompatMatrix()
    expect(result).toEqual([])
  })
})
