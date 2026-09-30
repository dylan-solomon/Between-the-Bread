export const REGIONS = ['Americas', 'Europe', 'Asia', 'Middle East', 'Africa', 'Oceania', 'Global'] as const

export type Region = (typeof REGIONS)[number]
