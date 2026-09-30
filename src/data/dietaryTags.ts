export const DIETARY_TAGS = [
  { tag: 'vegan', label: 'Vegan', filterLabel: 'Vegan', kind: 'require' },
  { tag: 'vegetarian', label: 'Vegetarian', filterLabel: 'Vegetarian', kind: 'require' },
  { tag: 'pescatarian', label: 'Pescatarian', filterLabel: 'Pescatarian', kind: 'require' },
  { tag: 'dairy_free', label: 'Dairy-Free', filterLabel: 'Dairy-Free', kind: 'require' },
  { tag: 'gluten_free', label: 'Gluten-Free', filterLabel: 'Gluten-Free', kind: 'require' },
  { tag: 'contains_pork', label: 'Contains Pork', filterLabel: 'No Pork', kind: 'avoid' },
  { tag: 'contains_shellfish', label: 'Contains Shellfish', filterLabel: 'No Shellfish', kind: 'avoid' },
  { tag: 'contains_peanuts', label: 'Contains Peanuts', filterLabel: 'No Peanuts', kind: 'avoid' },
] as const

export type DietaryTag = (typeof DIETARY_TAGS)[number]['tag']

export type DietaryTagDefinition = (typeof DIETARY_TAGS)[number]

export const getDietaryTag = (tag: DietaryTag): DietaryTagDefinition => {
  const definition = DIETARY_TAGS.find((entry) => entry.tag === tag)
  if (definition === undefined) throw new Error(`Unknown dietary tag: ${tag}`)
  return definition
}

export const isAvoidTag = (tag: DietaryTag): boolean => getDietaryTag(tag).kind === 'avoid'

export const isDietaryTag = (value: string): value is DietaryTag =>
  DIETARY_TAGS.some((entry) => entry.tag === value)

export const DIETARY_DISCLAIMER =
  "Dietary tags reflect typical ingredients and don't account for brand variation or cross-contamination. If you have an allergy, always check labels."
