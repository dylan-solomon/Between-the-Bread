export const REGIONS = ['Americas', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania', 'Global'] as const

export type Region = (typeof REGIONS)[number]

export const isRegion = (value: string): value is Region =>
  (REGIONS as readonly string[]).includes(value)
