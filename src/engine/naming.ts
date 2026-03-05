import type { SandwichComposition } from '@/types'

const NO_CHEESE_SLUG = 'no-cheese'

const hasCheeseSelection = (composition: SandwichComposition): boolean => {
  const cheese = composition.cheese.at(0)
  return cheese !== undefined && cheese.slug !== NO_CHEESE_SLUG
}

export const generateSandwichName = (composition: SandwichComposition): string => {
  const bread = composition.bread.at(0)
  const protein = composition.protein.at(0)
  const cheese = composition.cheese.at(0)

  const proteinName = protein?.name ?? 'Unknown Protein'
  const onBread = bread !== undefined ? ` on ${bread.name}` : ''

  if (!hasCheeseSelection(composition) || cheese === undefined) {
    return `${proteinName}${onBread}`
  }

  return `${proteinName} & ${cheese.name}${onBread}`
}
