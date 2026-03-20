import { describe, it, expect } from 'vitest'
import { calculateTotalEstimatedCost } from '@/utils/cost'
import { makeComposition, makeIngredient } from '@/test/factories'

// Default makeIngredient cost: { retail_low: 0.5, retail_high: 1.0, restaurant_low: 1.0, restaurant_high: 2.0 }
// Default makeComposition: 5 ingredients (bread, protein, cheese, toppings, condiments)

describe('calculateTotalEstimatedCost', () => {
  it('returns the correct retail range for a single-pick composition', () => {
    const result = calculateTotalEstimatedCost(makeComposition(), 'retail')
    // 5 ingredients × { retail_low: 0.5, retail_high: 1.0 }
    expect(result.low).toBeCloseTo(2.5)
    expect(result.high).toBeCloseTo(5.0)
  })

  it('returns the correct restaurant range for a single-pick composition', () => {
    const result = calculateTotalEstimatedCost(makeComposition(), 'restaurant')
    // 5 ingredients × { restaurant_low: 1.0, restaurant_high: 2.0 }
    expect(result.low).toBeCloseTo(5.0)
    expect(result.high).toBeCloseTo(10.0)
  })

  it('retail and restaurant contexts produce different totals', () => {
    const composition = makeComposition()
    const retail = calculateTotalEstimatedCost(composition, 'retail')
    const restaurant = calculateTotalEstimatedCost(composition, 'restaurant')
    expect(restaurant.low).toBeGreaterThan(retail.low)
    expect(restaurant.high).toBeGreaterThan(retail.high)
  })

  it('sums all ingredients when multiple toppings are selected', () => {
    const topping = makeIngredient({
      estimated_cost: { retail_low: 0.10, retail_high: 0.40, restaurant_low: 0.30, restaurant_high: 1.20 },
    })
    const composition = makeComposition({ toppings: [topping, topping, topping] })
    // bread+protein+cheese+condiments = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    // + 3 toppings × 0.10 = 0.30 low, 3 × 0.40 = 1.20 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(2.30)
    expect(result.high).toBeCloseTo(5.20)
  })

  it('sums both condiments when two are selected', () => {
    const condiment = makeIngredient({
      estimated_cost: { retail_low: 0.10, retail_high: 0.40, restaurant_low: 0.30, restaurant_high: 1.20 },
    })
    const composition = makeComposition({ condiments: [condiment, condiment] })
    // bread+protein+cheese+toppings = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    // + 2 condiments × 0.10 = 0.20 low, 2 × 0.40 = 0.80 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(2.20)
    expect(result.high).toBeCloseTo(4.80)
  })

  it('sums both proteins when double protein is selected', () => {
    const protein = makeIngredient({
      estimated_cost: { retail_low: 0.60, retail_high: 1.50, restaurant_low: 1.80, restaurant_high: 4.50 },
    })
    const composition = makeComposition({ protein: [protein, protein] })
    // bread+cheese+toppings+condiments = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    // + 2 proteins × 0.60 = 1.20 low, 2 × 1.50 = 3.0 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(3.20)
    expect(result.high).toBeCloseTo(7.00)
  })

  it('sums both cheeses when double cheese is selected', () => {
    const cheese = makeIngredient({
      estimated_cost: { retail_low: 0.30, retail_high: 0.80, restaurant_low: 0.90, restaurant_high: 2.40 },
    })
    const composition = makeComposition({ cheese: [cheese, cheese] })
    // bread+protein+toppings+condiments = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    // + 2 cheeses × 0.30 = 0.60 low, 2 × 0.80 = 1.60 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(2.60)
    expect(result.high).toBeCloseTo(5.60)
  })

  it('no-cheese contributes $0 to the total', () => {
    const noCheese = makeIngredient({
      slug: 'no-cheese',
      estimated_cost: { retail_low: 0, retail_high: 0, restaurant_low: 0, restaurant_high: 0 },
    })
    const composition = makeComposition({ cheese: [noCheese] })
    // bread+protein+toppings+condiments = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(2.0)
    expect(result.high).toBeCloseTo(4.0)
  })

  it('trigger ingredients contribute $0 to the total', () => {
    const trigger = makeIngredient({
      slug: 'chefs-pick-a',
      is_trigger: true,
      estimated_cost: { retail_low: 0, retail_high: 0, restaurant_low: 0, restaurant_high: 0 },
    })
    const composition = makeComposition({ toppings: [trigger] })
    // bread+protein+cheese+condiments = 4 × 0.5 = 2.0 low, 4 × 1.0 = 4.0 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(2.0)
    expect(result.high).toBeCloseTo(4.0)
  })

  it("includes Chef's Special in the total when present", () => {
    const special = makeIngredient({
      estimated_cost: { retail_low: 0.50, retail_high: 1.50, restaurant_low: 1.50, restaurant_high: 4.50 },
    })
    const composition = makeComposition({ 'chefs-special': [special] })
    // 5 base × 0.5 = 2.5 low, 5 × 1.0 = 5.0 high
    // + special: 0.50 low, 1.50 high
    const result = calculateTotalEstimatedCost(composition, 'retail')
    expect(result.low).toBeCloseTo(3.0)
    expect(result.high).toBeCloseTo(6.5)
  })
})
