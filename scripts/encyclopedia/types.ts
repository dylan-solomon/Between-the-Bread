export type IngredientCategory = 'bread' | 'protein' | 'cheese' | 'toppings' | 'condiments'

export type SheetColumn =
  | 'Wave'
  | 'Sandwich'
  | 'Short Description'
  | 'History'
  | 'Country'
  | 'Region'
  | 'Bread'
  | 'Protein'
  | 'Cheese'
  | 'Toppings'
  | 'Condiments'
  | 'Dietary Tags'
  | 'Wikipedia Article'
  | 'Alternative Names'

export type SheetRow = Partial<Record<SheetColumn, string | null>>

export type CanonicalIngredients = Partial<Record<IngredientCategory, { name: string }[]>>

export type EncyclopediaEntry = {
  name: string
  slug: string
  alternative_names: string[]
  description: string
  history: string
  origin_country: string | null
  origin_region: string | null
  canonical_ingredients: CanonicalIngredients
  dietary_tags: string[]
  image_url: string | null
  published: boolean
  source?: { wave: string | null; wikipedia: string | null }
}

export type Problem = { sandwich: string; message: string }

export type Note = { sandwich: string; category: IngredientCategory; text: string; reason: SkipReason }

export type SkipReason = 'optional' | 'not on the site'
