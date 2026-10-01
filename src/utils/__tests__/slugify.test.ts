import { describe, it, expect } from 'vitest'
import { slugify } from '@/utils/slugify'

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('The Perfect Grilled Cheese')).toBe('the-perfect-grilled-cheese')
  })

  it('drops punctuation and trims separators', () => {
    expect(slugify("  What's a Reuben?! ")).toBe('what-s-a-reuben')
  })

  it('removes accents', () => {
    expect(slugify('Croque Monsieur à la Crème')).toBe('croque-monsieur-a-la-creme')
  })

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('')
  })
})
