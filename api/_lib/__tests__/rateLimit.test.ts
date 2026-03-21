import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('../supabase.js', () => ({
  supabase: { from: mockFrom },
}))

import { checkShareRateLimit } from '../rateLimit.js'

const setupCountMock = (count: number, error: unknown = null) => {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          count,
          error,
        }),
      }),
    }),
  })
}

beforeEach(() => {
  mockFrom.mockReset()
})

describe('checkShareRateLimit', () => {
  it('returns allowed: true when under the limit', async () => {
    setupCountMock(2)
    const result = await checkShareRateLimit('192.168.1.1')
    expect(result).toEqual({ allowed: true })
  })

  it('returns allowed: false with retryAfterSeconds when at the limit', async () => {
    setupCountMock(10)
    const result = await checkShareRateLimit('192.168.1.1')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('queries the shared_sandwiches table', async () => {
    setupCountMock(0)
    await checkShareRateLimit('10.0.0.1')
    expect(mockFrom).toHaveBeenCalledWith('shared_sandwiches')
  })

  it('filters by the provided IP address', async () => {
    const mockEq = vi.fn().mockReturnValue({
      gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
    })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: mockEq }),
    })
    await checkShareRateLimit('10.0.0.1')
    expect(mockEq).toHaveBeenCalledWith('created_by_ip', '10.0.0.1')
  })

  it('returns allowed: true when Supabase query fails (fail-open)', async () => {
    setupCountMock(0, { message: 'db error' })
    const result = await checkShareRateLimit('192.168.1.1')
    expect(result).toEqual({ allowed: true })
  })

  it('returns allowed: true when ip is null', async () => {
    const result = await checkShareRateLimit(null)
    expect(result).toEqual({ allowed: true })
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
