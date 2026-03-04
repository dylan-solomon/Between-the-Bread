import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

const makeReq = (method = 'GET', id = 'test-uuid'): VercelRequest =>
  ({ method, query: { id } }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const stubIngredientRow = {
  id: 'ing-uuid',
  name: 'Sourdough',
  slug: 'sourdough',
  dietary_tags: ['vegetarian', 'vegan'],
  compat_group: 'neutral',
  estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 },
  nutrition: { calories: 120, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 },
  image_asset: '/assets/ingredients/bread/sourdough.png',
  is_trigger: false,
  categories: { id: 'cat-uuid', name: 'Bread', slug: 'bread' },
}

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/ingredients/:id', () => {
  it('returns 200 with the ingredient and its category when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: stubIngredientRow, error: null }),
        }),
      }),
    })

    const { default: handler } = await import('../ingredients/[id]')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(200)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: Record<string, unknown> }]
    const ingredient = jsonCall[0].data
    expect(ingredient).toHaveProperty('id', 'ing-uuid')
    expect(ingredient).toHaveProperty('name', 'Sourdough')
    expect(ingredient).toHaveProperty('category')
    const category = ingredient.category as Record<string, unknown>
    expect(category).toMatchObject({ id: 'cat-uuid', name: 'Bread', slug: 'bread' })
    expect(ingredient).not.toHaveProperty('categories')
  })

  it('returns 404 when ingredient is not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found' } }),
        }),
      }),
    })

    const { default: handler } = await import('../ingredients/[id]')
    const res = makeRes()
    await handler(makeReq('GET', 'nonexistent-uuid'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(404)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ error: { code: string } }]
    expect(jsonCall[0].error.code).toBe('INGREDIENT_NOT_FOUND')
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../ingredients/[id]')
    const res = makeRes()
    await handler(makeReq('POST'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })
})
