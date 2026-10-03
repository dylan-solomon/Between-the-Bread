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

const MEDALS: Partial<Record<number, { label: string; className: string }>> = {
  1: { label: '1st place', className: 'bg-amber-400 text-amber-950' },
  2: { label: '2nd place', className: 'bg-neutral-300 text-neutral-900' },
  3: { label: '3rd place', className: 'bg-orange-300 text-orange-950' },
}

export const rankBadge = (rank: number): { text: string; label: string; className: string } => {
  const medal = MEDALS[rank]
  return {
    text: `#${String(rank)}`,
    label: medal?.label ?? `Ranked ${String(rank)}`,
    className: `absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold shadow-sm ${medal?.className ?? 'bg-white text-neutral-700'}`,
  }
}
