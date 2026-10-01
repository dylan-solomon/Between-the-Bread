import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: mockFrom },
}))

const makeReq = (method = 'GET', query: Record<string, string> = {}): VercelRequest =>
  ({ method, query }) as unknown as VercelRequest

const makeRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as unknown as VercelResponse
  ;(res.status as ReturnType<typeof vi.fn>).mockReturnValue(res)
  return res
}

const stubCategory = {
  id: 'cat-1',
  name: 'Bread',
  slug: 'bread',
  display_order: 1,
  selection_type: 'single',
  min_picks: 1,
  max_picks: 1,
  emoji: '🍞',
  color: '#D4A056',
  has_double_toggle: false,
  is_bonus: false,
}

const stubIngredient = {
  id: 'ing-1',
  category_id: 'cat-1',
  name: 'Sourdough',
  slug: 'sourdough',
  dietary_tags: ['vegetarian', 'vegan'],
  compat_group: 'neutral',
  estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 },
  nutrition: { calories: 120, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 },
  image_asset: '/assets/ingredients/bread/sourdough.png',
  is_trigger: false,
  enabled: true,
}

const setupMock = (
  categories = [stubCategory],
  ingredients = [stubIngredient],
) => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'categories') {
      return { select: () => ({ order: () => Promise.resolve({ data: categories, error: null }) }) }
    }
    if (table === 'config') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { value: '2026-03-01' }, error: null }) }) }) }
    }
    return { select: () => Promise.resolve({ data: ingredients, error: null }) }
  })
}

beforeEach(() => { mockFrom.mockReset() })

describe('GET /api/ingredients', () => {
  it('returns 200 with ingredients grouped by category', async () => {
    setupMock()
    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(200)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: unknown[] }; meta: Record<string, unknown> }]
    const body = jsonCall[0]
    expect(body.data.categories).toHaveLength(1)
    expect(body.meta).toMatchObject({
      ingredient_count: 1,
      cost_data_last_updated: '2026-03-01',
      filters_applied: [],
    })
  })

  it('nests ingredients under their category and omits category_id', async () => {
    setupMock()
    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq(), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: Array<{ ingredients: unknown[] }> } }]
    const cat = jsonCall[0].data.categories[0] as Record<string, unknown>
    const ingredients = cat.ingredients as unknown[]
    expect(ingredients).toHaveLength(1)
    const ing = ingredients[0] as Record<string, unknown>
    expect(ing).toHaveProperty('id', 'ing-1')
    expect(ing).not.toHaveProperty('category_id')
  })

  it('lists disabled ingredients separately so saved sandwiches can still load them', async () => {
    const published = { ...stubIngredient, id: 'ing-1', name: 'Sourdough', slug: 'sourdough' }
    const hidden = { ...stubIngredient, id: 'ing-2', name: 'Pain de mie', slug: 'pain-de-mie', enabled: false }
    setupMock([stubCategory], [published, hidden])

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq(), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: Array<{ ingredients: Array<{ slug: string }>; hidden_ingredients: Array<Record<string, unknown>> }> } }]
    const category = jsonCall[0].data.categories[0]
    expect(category.ingredients.map((i) => i.slug)).toEqual(['sourdough'])
    expect(category.hidden_ingredients.map((i) => i.slug)).toEqual(['pain-de-mie'])
    expect(category.hidden_ingredients[0]).not.toHaveProperty('category_id')
    expect(category.hidden_ingredients[0]).not.toHaveProperty('enabled')
  })

  it('does not count disabled ingredients in the ingredient total', async () => {
    const published = { ...stubIngredient, id: 'ing-1' }
    const hidden = { ...stubIngredient, id: 'ing-2', slug: 'pain-de-mie', enabled: false }
    setupMock([stubCategory], [published, hidden])

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq(), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ meta: Record<string, unknown> }]
    expect(jsonCall[0].meta.ingredient_count).toBe(1)
  })

  it('does not apply dietary filters to disabled ingredients', async () => {
    const vegan = { ...stubIngredient, id: 'ing-1', dietary_tags: ['vegan'] }
    const hiddenMeat = { ...stubIngredient, id: 'ing-2', slug: 'roast-pork', dietary_tags: ['contains_pork'], enabled: false }
    setupMock([stubCategory], [vegan, hiddenMeat])

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq('GET', { diet: 'vegan' }), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: Array<{ hidden_ingredients: unknown[] }> } }]
    expect(jsonCall[0].data.categories[0]?.hidden_ingredients).toHaveLength(1)
  })

  it('filters by diet when ?diet= is provided', async () => {
    const veganIngredient = { ...stubIngredient, id: 'ing-1', dietary_tags: ['vegetarian', 'vegan'] }
    const nonVeganIngredient = { ...stubIngredient, id: 'ing-2', name: 'Ham', slug: 'ham', dietary_tags: ['gluten_free'] }
    setupMock([stubCategory], [veganIngredient, nonVeganIngredient])

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq('GET', { diet: 'vegan' }), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: Array<{ ingredients: unknown[] }> }; meta: Record<string, unknown> }]
    const body = jsonCall[0]
    const ingredients = body.data.categories[0]?.ingredients ?? []
    expect(ingredients).toHaveLength(1)
    expect(body.meta.ingredient_count).toBe(1)
    expect(body.meta.filters_applied).toEqual(['vegan'])
  })

  it('removes ingredients carrying an avoided tag when ?diet= names a contains tag', async () => {
    const turkey = { ...stubIngredient, id: 'ing-1', name: 'Turkey', slug: 'turkey', dietary_tags: ['dairy_free'] }
    const ham = { ...stubIngredient, id: 'ing-2', name: 'Ham', slug: 'ham', dietary_tags: ['dairy_free', 'contains_pork'] }
    setupMock([stubCategory], [turkey, ham])

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq('GET', { diet: 'contains_pork' }), res)

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ data: { categories: Array<{ ingredients: Array<{ slug: string }> }> } }]
    const slugs = (jsonCall[0].data.categories[0]?.ingredients ?? []).map((i) => i.slug)
    expect(slugs).toEqual(['turkey'])
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq('POST'), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(405)
  })

  it('returns 500 when Supabase returns an error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'categories') {
        return { select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'db error' } }) }) }
      }
      if (table === 'config') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { value: '2026-03-01' }, error: null }) }) }) }
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }
    })

    const { default: handler } = await import('../ingredients')
    const res = makeRes()
    await handler(makeReq(), res)

    expect((res.status as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500)
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0] as [{ error: { code: string } }]
    expect(jsonCall[0].error.code).toBe('INTERNAL_ERROR')
  })
})
