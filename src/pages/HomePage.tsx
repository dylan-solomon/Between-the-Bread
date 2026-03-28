import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import CategoryList from '@/components/CategoryList'
import ChefSpecialRow from '@/components/ChefSpecialRow'
import DietaryFilters from '@/components/DietaryFilters'
import RollAllButton from '@/components/RollAllButton'
import SandwichVisual from '@/components/SandwichVisual'
import SessionHistory from '@/components/SessionHistory'
import SmartModeToggle from '@/components/SmartModeToggle'
import SummaryCard from '@/components/SummaryCard'
import { useSandwichSession } from '@/hooks/useSandwichSession'
import { useSessionHistory } from '@/hooks/useSessionHistory'
import { useRollOrchestration } from '@/hooks/useRollOrchestration'
import { useIngredients } from '@/hooks/useIngredients'
import { useCompatMatrix } from '@/hooks/useCompatMatrix'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/context/AuthContext'
import { useAuthPrompt } from '@/context/AuthPromptContext'
import { filterByDiet } from '@/utils/dietary'
import { resolveComposition } from '@/utils/resolveComposition'
import { BASE_CATEGORIES } from '@/engine/randomizer'
import { saveSandwich, updateSavedSandwich } from '@/api/savedSandwiches'
import { generateSandwichName } from '@/engine/naming'
import {
  captureDietaryFilterToggled,
  captureDietaryFilterWarning,
  captureSmartModeToggled,
  captureDoubleToggled,
  captureHistorySandwichSaved,
  captureHistorySandwichRated,
} from '@/analytics/events'
import {
  setDietaryFilters,
  setUsesSmartMode,
  setUsesDoubleProtein,
  setUsesDoubleCheese,
  setLastActiveAt,
} from '@/analytics/userProperties'
import type { CategorySlug, DoubleCategory, DietaryTag, Ingredient, SandwichComposition } from '@/types'
import type { CostContext } from '@/utils/cost'

const EMPTY_POOLS: Partial<Record<CategorySlug, Ingredient[]>> = {}

export default function HomePage() {
  const { pools, categories, costDataLastUpdated, loading } = useIngredients()
  const { matrix } = useCompatMatrix()
  const { profile } = useProfile()
  const { user, session: authSession } = useAuth()
  const { prompt } = useAuthPrompt()
  const session = useSandwichSession()
  const history = useSessionHistory()
  const [activeDietFilters, setActiveDietFilters] = useState<DietaryTag[]>([])
  const [smartMode, setSmartMode] = useState(false)
  const [defaultCostContext, setDefaultCostContext] = useState<CostContext>('retail')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [currentRating, setCurrentRating] = useState<number | null>(null)
  const profileApplied = useRef(false)
  const savedSandwichLoaded = useRef(false)

  useEffect(() => {
    if (loading || savedSandwichLoaded.current) return
    const raw = sessionStorage.getItem('btb_load_sandwich')
    if (raw === null) return
    sessionStorage.removeItem('btb_load_sandwich')
    savedSandwichLoaded.current = true
    try {
      const parsed = JSON.parse(raw) as { composition?: Record<string, unknown[]>; savedId?: string; rating?: number }
      if (parsed.composition !== undefined) {
        const resolved = resolveComposition(parsed.composition, pools)
        if (resolved !== null) {
          session.loadComposition(resolved)
          if (typeof parsed.savedId === 'string') setSavedId(parsed.savedId)
          if (typeof parsed.rating === 'number') setCurrentRating(parsed.rating)
        }
      }
    } catch {
      // Invalid data — silently ignore
    }
  }, [loading, pools, session])

  useEffect(() => {
    if (profile === null || profileApplied.current) return
    profileApplied.current = true
    setActiveDietFilters(profile.dietary_filters)
    setSmartMode(profile.smart_mode_default)
    setDefaultCostContext(profile.cost_context)
    if (profile.double_protein) { session.toggleDouble('protein') }
    if (profile.double_cheese) { session.toggleDouble('cheese') }
  }, [profile, session])

  const toggleDietFilter = (tag: DietaryTag) => {
    setActiveDietFilters((prev) => {
      const isActive = !prev.includes(tag)
      const newFilters = isActive ? [...prev, tag] : prev.filter((t) => t !== tag)
      captureDietaryFilterToggled({ tag, isActive, activeFilters: newFilters })
      setDietaryFilters(newFilters)
      if (newFilters.length > 0) {
        const emptyCategories = BASE_CATEGORIES.filter(
          (slug) => filterByDiet(pools[slug] ?? [], newFilters).length === 0,
        )
        if (emptyCategories.length > 0) {
          captureDietaryFilterWarning({ tag, affectedCategories: emptyCategories })
        }
      }
      return newFilters
    })
  }

  const activePools = useMemo(() => {
    if (loading) return EMPTY_POOLS
    if (activeDietFilters.length === 0) return pools
    return Object.fromEntries(
      Object.entries(pools).map(([slug, pool]) => [slug, filterByDiet(pool, activeDietFilters)]),
    ) as Partial<Record<CategorySlug, Ingredient[]>>
  }, [loading, pools, activeDietFilters])

  const handleToggleDouble = (category: DoubleCategory) => {
    const enabled = !session.doubleCategories.has(category)
    session.toggleDouble(category)
    captureDoubleToggled({ category, enabled })
    if (category === 'protein') setUsesDoubleProtein(enabled)
    if (category === 'cheese') setUsesDoubleCheese(enabled)
  }

  const toggleSmartMode = (next: boolean) => {
    setSmartMode(next)
    captureSmartModeToggled({ isActive: next })
    setUsesSmartMode(next)
  }

  const serializeComposition = (composition: SandwichComposition): Record<string, unknown[]> =>
    Object.fromEntries(
      Object.entries(composition).map(([cat, ingredients]) => [
        cat,
        ingredients.map((i) => ({ slug: i.slug, name: i.name })),
      ]),
    ) as Record<string, unknown[]>

  const handleSave = useCallback(async () => {
    if (user === null || authSession === null) {
      prompt('save your sandwich')
      return
    }
    if (session.composition === null) return

    try {
      const name = generateSandwichName(session.composition)
      const result = await saveSandwich(authSession.access_token, {
        composition: serializeComposition(session.composition),
        name,
      })
      setSavedId(result.id)
      captureHistorySandwichSaved({ sandwichName: name, savedCount: 1 })
      setLastActiveAt()
      toast.success('Sandwich saved!')
    } catch {
      toast.error('Failed to save sandwich. Please try again.')
    }
  }, [user, authSession, session.composition, prompt])

  const handleRate = useCallback(async (rating: number) => {
    if (user === null || authSession === null) {
      prompt('rate this sandwich')
      return
    }

    let currentSavedId = savedId

    if (currentSavedId === null && session.composition !== null) {
      try {
        const name = generateSandwichName(session.composition)
        const result = await saveSandwich(authSession.access_token, {
          composition: serializeComposition(session.composition),
          name,
        })
        currentSavedId = result.id
        setSavedId(result.id)
        captureHistorySandwichSaved({ sandwichName: name, savedCount: 1 })
      } catch {
        toast.error('Failed to save sandwich. Please try again.')
        return
      }
    }

    if (currentSavedId === null) return

    try {
      const previousRating = currentRating
      await updateSavedSandwich(authSession.access_token, currentSavedId, { rating })
      setCurrentRating(rating)
      captureHistorySandwichRated({
        rating,
        previousRating,
        sandwichName: session.composition !== null ? generateSandwichName(session.composition) : '',
      })
      setLastActiveAt()
    } catch {
      toast.error('Failed to save rating. Please try again.')
    }
  }, [user, authSession, savedId, session.composition, prompt, currentRating])

  const { isRolling, rollingCategory, chefsSpecial, chefsSpecialLocked, toggleChefsSpecialLock, rollAll, rollOne, loadFromHistory } =
    useRollOrchestration(
      { ...session, addHistoryEntry: history.addEntry },
      activePools,
      categories,
      activeDietFilters,
      smartMode,
      matrix,
    )

  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-8 flex flex-col gap-6">
        <div className={session.composition !== null && !isRolling ? 'animate-float' : undefined}>
          <SandwichVisual composition={session.composition} />
        </div>

        <div className="min-h-20">
          {!isRolling && (
            <SummaryCard
              composition={session.composition}
              costDataLastUpdated={costDataLastUpdated}
              defaultCostContext={defaultCostContext}
              onSave={() => { void handleSave() }}
              savedId={savedId}
              onRate={(r) => { void handleRate(r) }}
              currentRating={currentRating}
            />
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <DietaryFilters activeTags={activeDietFilters} onToggle={toggleDietFilter} />
        </div>

        <RollAllButton
          hasRolled={session.hasRolled}
          isRolling={isRolling}
          disabled={loading}
          onClick={() => { setSavedId(null); setCurrentRating(null); rollAll() }}
        />

        <div className="flex justify-center">
          <SmartModeToggle isActive={smartMode} onToggle={toggleSmartMode} />
        </div>

        <CategoryList
          composition={session.composition}
          lockedCategories={session.lockedCategories}
          doubleCategories={session.doubleCategories}
          isRolling={isRolling}
          rollingCategory={rollingCategory}
          onToggleLock={session.toggleLock}
          onToggleDouble={handleToggleDouble}
          onRoll={rollOne}
          categories={categories}
          pools={activePools}
        />

        <ChefSpecialRow
          chefsSpecial={chefsSpecial}
          isLocked={chefsSpecialLocked}
          onToggleLock={toggleChefsSpecialLock}
        />

        <SessionHistory
          entries={history.entries}
          onLoad={(entry) => { loadFromHistory(entry.composition) }}
        />
      </div>
    </AppShell>
  )
}
