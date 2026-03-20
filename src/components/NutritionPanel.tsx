import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { SandwichComposition } from '@/types'
import { calculateTotalNutrition } from '@/utils/nutrition'
import { captureNutritionPanelExpanded, captureNutritionPanelCollapsed } from '@/analytics/events'

type Props = {
  composition: SandwichComposition
}

const NUTRITION_FIELDS = [
  { key: 'calories', label: 'Calories', unit: '' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fiber_g', label: 'Fiber', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
  { key: 'sugar_g', label: 'Sugar', unit: 'g' },
] as const

export default function NutritionPanel({ composition }: Props) {
  const [expanded, setExpanded] = useState(false)
  const totals = calculateTotalNutrition(composition)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    if (next) {
      captureNutritionPanelExpanded()
    } else {
      captureNutritionPanelCollapsed()
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
      >
        {expanded ? 'Hide nutrition' : 'Show nutrition'}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-2 animate-fade-up">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {NUTRITION_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="text-center">
                <p className="text-lg font-bold text-neutral-800">
                  {totals[key]}{unit}
                </p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            ))}
          </div>

          <p className="mt-2 text-xs text-neutral-400">
            Nutritional information is estimated based on USDA standard serving sizes and may not reflect actual nutritional content.
          </p>
        </div>
      )}
    </div>
  )
}
