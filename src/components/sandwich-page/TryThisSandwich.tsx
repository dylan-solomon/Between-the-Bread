import { useNavigate } from 'react-router-dom'
import { useIngredients } from '@/hooks/useIngredients'
import { LOAD_SANDWICH_KEY } from '@/hooks/useSessionHistory'
import type { CategorySlug, Ingredient } from '@/types'

type CanonicalIngredient = { name: string; slug?: string }

type Props = {
  composition: Partial<Record<CategorySlug, CanonicalIngredient[]>>
  exact: boolean
  onTry?: () => void
}

const findByName = (pool: Ingredient[], name: string): Ingredient | undefined =>
  pool.find((ingredient) => ingredient.name.toLowerCase() === name.toLowerCase())

export default function TryThisSandwich({ composition, exact, onTry }: Props) {
  const navigate = useNavigate()
  const { lookupPools } = useIngredients()

  const handleClick = () => {
    onTry?.()
    const resolved: Partial<Record<CategorySlug, { slug: string; name: string }[]>> = {}

    for (const [category, ingredients] of Object.entries(composition) as [CategorySlug, CanonicalIngredient[]][]) {
      if (exact) {
        const withSlugs = ingredients
          .filter((i): i is CanonicalIngredient & { slug: string } => i.slug !== undefined)
          .map((i) => ({ slug: i.slug, name: i.name }))
        if (withSlugs.length > 0) resolved[category] = withSlugs
        continue
      }

      const pool = lookupPools[category] ?? []
      const matched = ingredients
        .map((i) => findByName(pool, i.name))
        .filter((match): match is Ingredient => match !== undefined)
        .map((match) => ({ slug: match.slug, name: match.name }))

      if (matched.length > 0) resolved[category] = matched
    }

    sessionStorage.setItem(LOAD_SANDWICH_KEY, JSON.stringify({ composition: resolved }))
    void navigate('/')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
    >
      Try This Sandwich
    </button>
  )
}
