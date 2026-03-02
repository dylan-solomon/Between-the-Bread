import type { SandwichComposition } from '@/types'

const NO_CHEESE_SLUG = 'no-cheese'

const hasCheeseSelection = (composition: SandwichComposition): boolean => {
  const [cheese] = composition.cheese
  return cheese !== undefined && cheese.slug !== NO_CHEESE_SLUG
}

export const generateSandwichName = (composition: SandwichComposition): string => {
  const [bread] = composition.bread
  const [protein] = composition.protein
  const [cheese] = composition.cheese

  const breadName = bread?.name ?? 'Unknown Bread'
  const proteinName = protein?.name ?? 'Unknown Protein'

  if (!hasCheeseSelection(composition) || !cheese) {
    return `${proteinName} on ${breadName}`
  }

  return `${proteinName} & ${cheese.name} on ${breadName}`
}
