import type { Nutrition, SandwichComposition } from '@/types'

export const calculateTotalNutrition = (composition: SandwichComposition): Nutrition => {
  const allIngredients = [
    ...composition.bread,
    ...composition.protein,
    ...composition.cheese,
    ...composition.toppings,
    ...composition.condiments,
    ...(composition['chefs-special'] ?? []),
  ]

  return allIngredients.reduce<Nutrition>(
    (acc, ingredient) => ({
      calories: acc.calories + ingredient.nutrition.calories,
      protein_g: acc.protein_g + ingredient.nutrition.protein_g,
      fat_g: acc.fat_g + ingredient.nutrition.fat_g,
      carbs_g: acc.carbs_g + ingredient.nutrition.carbs_g,
      fiber_g: acc.fiber_g + ingredient.nutrition.fiber_g,
      sodium_mg: acc.sodium_mg + ingredient.nutrition.sodium_mg,
      sugar_g: acc.sugar_g + ingredient.nutrition.sugar_g,
    }),
    { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sodium_mg: 0, sugar_g: 0 },
  )
}
