import { useState, useEffect } from 'react'
import type { Category, CategorySlug, Ingredient } from '@/types'
import { fetchIngredients } from '@/api/ingredients'

type UseIngredientsResult = {
  pools: Partial<Record<CategorySlug, Ingredient[]>>
  categories: Category[]
  loading: boolean
  error: string | null
}

export const useIngredients = (): UseIngredientsResult => {
  const [pools, setPools] = useState<Partial<Record<CategorySlug, Ingredient[]>>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchIngredients()
      .then((result) => {
        if (!cancelled) {
          setPools(result.pools)
          setCategories(result.categories)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load ingredients')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { pools, categories, loading, error }
}
