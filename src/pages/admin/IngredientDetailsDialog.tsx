import { useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import type { AdminIngredient } from '@/api/admin'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { COST_FIELDS, NUTRITION_FIELDS } from '@/utils/ingredientData'
import type { DataField } from '@/utils/ingredientData'

const initialValues = (ingredient: AdminIngredient): Record<string, string> =>
  Object.fromEntries([
    ...NUTRITION_FIELDS.map(({ key }) => [key, String(ingredient.nutrition?.[key] ?? '')] as const),
    ...COST_FIELDS.map(({ key }) => [key, String(ingredient.estimated_cost?.[key] ?? '')] as const),
  ])

const toNumbers = (values: Record<string, string>, fields: DataField[]): Record<string, number> | null => {
  const numbers = fields.map(({ key }) => [key, values[key].trim() === '' ? Number.NaN : Number(values[key])] as const)
  return numbers.every(([, value]) => Number.isFinite(value) && value >= 0) ? Object.fromEntries(numbers) : null
}

type Props = {
  ingredient: AdminIngredient
  saving: boolean
  onSave: (data: { nutrition: Record<string, number>; estimated_cost: Record<string, number> }) => void
  onCancel: () => void
}

export default function IngredientDetailsDialog({ ingredient, saving, onSave, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(ingredient))
  const dialogRef = useDialogFocus<HTMLDivElement>()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nutrition = toNumbers(values, NUTRITION_FIELDS)
    const cost = toNumbers(values, COST_FIELDS)
    if (nutrition === null || cost === null) {
      toast.error('Enter a number of zero or more for every nutrition and cost field.')
      return
    }
    if (cost.retail_low > cost.retail_high || cost.restaurant_low > cost.restaurant_high) {
      toast.error('Each low cost must be no higher than its high cost.')
      return
    }
    onSave({ nutrition, estimated_cost: cost })
  }

  const renderField = ({ key, label }: DataField) => (
    <label key={key} className="block text-xs text-neutral-700">
      {label}
      <input
        type="number"
        step="any"
        min="0"
        value={values[key] ?? ''}
        onChange={(e) => { setValues((prev) => ({ ...prev, [key]: e.target.value })) }}
        className="mt-1 block w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      />
    </label>
  )

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Nutrition and cost: ${ingredient.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
    >
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md rounded-md bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-neutral-900">{`${ingredient.name}: nutrition and cost`}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Values are per serving: bread 1 slice, protein 2 oz, cheese 1 oz, toppings about 1 oz, condiments 1 tbsp. An ingredient needs every field before it can be enabled.
        </p>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-neutral-800">Nutrition</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">{NUTRITION_FIELDS.map(renderField)}</div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-neutral-800">Estimated cost per serving</legend>
          <div className="mt-2 grid grid-cols-2 gap-3">{COST_FIELDS.map(renderField)}</div>
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
