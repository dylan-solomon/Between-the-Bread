import type { CommunityComposition, CommunityIngredient } from '../api/community'
import { CATEGORY_ORDER } from '../data/categoryLabels'
import type { CategorySlug } from '../types'

export const communityGroups = (
  composition: CommunityComposition,
): { slug: CategorySlug; items: CommunityIngredient[] }[] =>
  CATEGORY_ORDER.flatMap((slug) => {
    const items = composition[slug] ?? []
    return items.length > 0 ? [{ slug, items }] : []
  })

export const madeLabel = (count: number): string => (count === 1 ? 'Made once' : `Made ${String(count)} times`)

const listOf = (names: string[]): string =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.slice(-1).join('')}`

export const communityDescription = (sandwich: {
  name: string
  composition: CommunityComposition
  generated_count: number
}): string => {
  const names = communityGroups(sandwich.composition).flatMap(({ items }) => items.map((item) => item.name))
  return `${sandwich.name}: ${listOf(names)}. ${madeLabel(sandwich.generated_count)} by the Between the Bread community.`
}
