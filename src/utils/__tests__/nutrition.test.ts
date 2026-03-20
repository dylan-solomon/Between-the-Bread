import { describe, it, expect } from 'vitest'
import { calculateTotalNutrition } from '@/utils/nutrition'
import { makeComposition, makeIngredient } from '@/test/factories'

// Default makeIngredient nutrition: { calories: 100, protein_g: 5, fat_g: 3, carbs_g: 10, fiber_g: 1, sodium_mg: 100, sugar_g: 2 }
// Default makeComposition: 5 ingredients (bread, protein, cheese, toppings, condiments)

describe('calculateTotalNutrition', () => {
  it('sums all 7 nutrition fields across a standard composition', () => {
    const result = calculateTotalNutrition(makeComposition())
    // 5 ingredients × default values
    expect(result.calories).toBe(500)
    expect(result.protein_g).toBe(25)
    expect(result.fat_g).toBe(15)
    expect(result.carbs_g).toBe(50)
    expect(result.fiber_g).toBe(5)
    expect(result.sodium_mg).toBe(500)
    expect(result.sugar_g).toBe(10)
  })

  it('sums ingredients with different nutrition values', () => {
    const bread = makeIngredient({ nutrition: { calories: 120, protein_g: 4, fat_g: 1, carbs_g: 24, fiber_g: 2, sodium_mg: 210, sugar_g: 1 } })
    const protein = makeIngredient({ nutrition: { calories: 180, protein_g: 25, fat_g: 8, carbs_g: 0, fiber_g: 0, sodium_mg: 400, sugar_g: 0 } })
    const cheese = makeIngredient({ nutrition: { calories: 110, protein_g: 7, fat_g: 9, carbs_g: 1, fiber_g: 0, sodium_mg: 180, sugar_g: 0 } })
    const topping = makeIngredient({ nutrition: { calories: 5, protein_g: 0, fat_g: 0, carbs_g: 1, fiber_g: 1, sodium_mg: 5, sugar_g: 0 } })
    const condiment = makeIngredient({ nutrition: { calories: 90, protein_g: 0, fat_g: 10, carbs_g: 0, fiber_g: 0, sodium_mg: 80, sugar_g: 0 } })
    const composition = makeComposition({ bread: [bread], protein: [protein], cheese: [cheese], toppings: [topping], condiments: [condiment] })
    const result = calculateTotalNutrition(composition)
    expect(result.calories).toBe(505)
    expect(result.protein_g).toBe(36)
    expect(result.fat_g).toBe(28)
    expect(result.carbs_g).toBe(26)
    expect(result.fiber_g).toBe(3)
    expect(result.sodium_mg).toBe(875)
    expect(result.sugar_g).toBe(1)
  })

  it('sums all ingredients when multiple toppings are selected', () => {
    const topping = makeIngredient({ nutrition: { calories: 10, protein_g: 1, fat_g: 0, carbs_g: 2, fiber_g: 1, sodium_mg: 5, sugar_g: 1 } })
    const composition = makeComposition({ toppings: [topping, topping, topping] })
    // 4 base × 100 cal + 3 × 10 cal = 430
    expect(calculateTotalNutrition(composition).calories).toBe(430)
  })

  it('sums both proteins when double protein is selected', () => {
    const protein = makeIngredient({ nutrition: { calories: 200, protein_g: 30, fat_g: 10, carbs_g: 0, fiber_g: 0, sodium_mg: 500, sugar_g: 0 } })
    const composition = makeComposition({ protein: [protein, protein] })
    // 4 base × 100 cal + 2 × 200 cal = 800
    expect(calculateTotalNutrition(composition).calories).toBe(800)
    expect(calculateTotalNutrition(composition).protein_g).toBe(80)
  })

  it('sums both cheeses when double cheese is selected', () => {
    const cheese = makeIngredient({ nutrition: { calories: 110, protein_g: 7, fat_g: 9, carbs_g: 1, fiber_g: 0, sodium_mg: 180, sugar_g: 0 } })
    const composition = makeComposition({ cheese: [cheese, cheese] })
    // 4 base × 100 cal + 2 × 110 cal = 620
    expect(calculateTotalNutrition(composition).calories).toBe(620)
  })

  it('no-cheese contributes zero to all nutrition fields', () => {
    const noCheese = makeIngredient({
      slug: 'no-cheese',
      nutrition: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0 },
    })
    const composition = makeComposition({ cheese: [noCheese] })
    // 4 base × default
    expect(calculateTotalNutrition(composition).calories).toBe(400)
  })

  it('trigger ingredients contribute zero to all nutrition fields', () => {
    const trigger = makeIngredient({
      is_trigger: true,
      nutrition: { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0 },
    })
    const composition = makeComposition({ toppings: [trigger] })
    // 4 base × default
    expect(calculateTotalNutrition(composition).calories).toBe(400)
  })

  it("includes Chef's Special in the total when present", () => {
    const special = makeIngredient({
      nutrition: { calories: 50, protein_g: 0, fat_g: 3, carbs_g: 5, fiber_g: 0, sodium_mg: 30, sugar_g: 4 },
    })
    const composition = makeComposition({ 'chefs-special': [special] })
    // 5 base × 100 cal + 50 = 550
    expect(calculateTotalNutrition(composition).calories).toBe(550)
    expect(calculateTotalNutrition(composition).sugar_g).toBe(14)
  })

  it('returns zero for all fields when all ingredients have zero nutrition', () => {
    const zero = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0 }
    const zeroIngredient = makeIngredient({ nutrition: zero })
    const composition = makeComposition({
      bread: [zeroIngredient],
      protein: [zeroIngredient],
      cheese: [zeroIngredient],
      toppings: [zeroIngredient],
      condiments: [zeroIngredient],
    })
    const result = calculateTotalNutrition(composition)
    expect(result.calories).toBe(0)
    expect(result.protein_g).toBe(0)
    expect(result.fat_g).toBe(0)
    expect(result.carbs_g).toBe(0)
    expect(result.fiber_g).toBe(0)
    expect(result.sodium_mg).toBe(0)
    expect(result.sugar_g).toBe(0)
  })
})
