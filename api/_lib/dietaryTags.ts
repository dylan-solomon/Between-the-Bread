export const DIETARY_TAGS = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'dairy_free',
  'gluten_free',
  'contains_pork',
  'contains_shellfish',
  'contains_peanuts',
] as const

export const AVOID_TAGS = ['contains_pork', 'contains_shellfish', 'contains_peanuts'] as const

export type DietaryTag = (typeof DIETARY_TAGS)[number]

export const isDietaryTag = (value: string): value is DietaryTag =>
  (DIETARY_TAGS as readonly string[]).includes(value)

export const isAvoidTag = (value: string): boolean => (AVOID_TAGS as readonly string[]).includes(value)

export const matchesDiet = (itemTags: string[], activeTags: string[]): boolean =>
  activeTags.every((tag) => (isAvoidTag(tag) ? !itemTags.includes(tag) : itemTags.includes(tag)))
