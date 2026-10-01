import { describe, it, expect } from 'vitest'
import { isSlug, slugify } from '../slug.js'

describe('slugify', () => {
  it('lowercases and joins words with hyphens', () => {
    expect(slugify('Best Pairings')).toBe('best-pairings')
  })

  it('drops punctuation and collapses repeated separators', () => {
    expect(slugify('  Techniques & Guides!  ')).toBe('techniques-guides')
  })

  it('removes accents', () => {
    expect(slugify('Croque Monsieur à la Crème')).toBe('croque-monsieur-a-la-creme')
  })

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('!!!')).toBe('')
  })

  it('produces values that pass the slug check', () => {
    expect(isSlug(slugify('Dietary: Vegan & Gluten-Free'))).toBe(true)
  })
})
