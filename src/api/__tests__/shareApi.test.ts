import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SandwichComposition } from '@/types'
import { createShare, fetchShare } from '@/api/shareApi'

const stubComposition: SandwichComposition = {
  bread: [],
  protein: [],
  cheese: [],
  toppings: [],
  condiments: [],
}

const makeOkResponse = (body: unknown) =>
  ({ ok: true, json: vi.fn().mockResolvedValue(body) }) as unknown as Response

const makeErrResponse = (status: number) =>
  ({ ok: false, status }) as unknown as Response

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  Object.defineProperty(window, 'location', {
    value: { origin: 'https://betweenbread.co' },
    configurable: true,
  })
})

describe('createShare', () => {
  it('POSTs to /api/sandwiches/share with composition and name', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' } }),
    )

    await createShare({ composition: stubComposition, name: 'The Club' })

    expect(fetch).toHaveBeenCalledWith(
      'https://betweenbread.co/api/sandwiches/share',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }) as Record<string, string>,
        body: expect.stringContaining('"name":"The Club"') as string,
      }),
    )
  })

  it('returns { hash, url } on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' } }),
    )

    const result = await createShare({ composition: stubComposition, name: 'The Club' })

    expect(result).toEqual({ hash: 'abc12345', url: 'https://betweenbread.co/s/abc12345' })
  })

  it('throws when the response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrResponse(500))

    await expect(createShare({ composition: stubComposition, name: 'The Club' })).rejects.toThrow()
  })
})

describe('fetchShare', () => {
  it('GETs /api/sandwiches/share/:hash', async () => {
    vi.mocked(fetch).mockResolvedValue(
      makeOkResponse({ data: { hash: 'abc12345', name: 'The Club', composition: stubComposition } }),
    )

    await fetchShare('abc12345')

    expect(fetch).toHaveBeenCalledWith('https://betweenbread.co/api/sandwiches/share/abc12345')
  })

  it('returns the share record on success', async () => {
    const record = { hash: 'abc12345', name: 'The Club', composition: stubComposition }
    vi.mocked(fetch).mockResolvedValue(makeOkResponse({ data: record }))

    const result = await fetchShare('abc12345')

    expect(result).toEqual(record)
  })

  it('throws when response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValue(makeErrResponse(404))

    await expect(fetchShare('abc12345')).rejects.toThrow()
  })
})
