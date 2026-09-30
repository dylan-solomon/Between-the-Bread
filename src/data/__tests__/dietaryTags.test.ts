import { describe, it, expect } from 'vitest'
import { DIETARY_TAGS, getDietaryTag, isAvoidTag } from '@/data/dietaryTags'

describe('DIETARY_TAGS', () => {
  it('defines the eight supported tags in display order', () => {
    expect(DIETARY_TAGS.map((t) => t.tag)).toEqual([
      'vegan',
      'vegetarian',
      'pescatarian',
      'dairy_free',
      'gluten_free',
      'contains_pork',
      'contains_shellfish',
      'contains_peanuts',
    ])
  })

  it('labels each tag for display', () => {
    expect(DIETARY_TAGS.map((t) => t.label)).toEqual([
      'Vegan',
      'Vegetarian',
      'Pescatarian',
      'Dairy-Free',
      'Gluten-Free',
      'Contains Pork',
      'Contains Shellfish',
      'Contains Peanuts',
    ])
  })

  it('words the avoid filters as exclusions', () => {
    expect(getDietaryTag('contains_pork').filterLabel).toBe('No Pork')
    expect(getDietaryTag('contains_shellfish').filterLabel).toBe('No Shellfish')
    expect(getDietaryTag('contains_peanuts').filterLabel).toBe('No Peanuts')
  })

  it('uses the plain label as the filter label for must-have tags', () => {
    expect(getDietaryTag('gluten_free').filterLabel).toBe('Gluten-Free')
  })
})

describe('isAvoidTag', () => {
  it.each(['contains_pork', 'contains_shellfish', 'contains_peanuts'] as const)('treats %s as an avoid tag', (tag) => {
    expect(isAvoidTag(tag)).toBe(true)
  })

  it.each(['vegan', 'vegetarian', 'pescatarian', 'dairy_free', 'gluten_free'] as const)('treats %s as a must-have tag', (tag) => {
    expect(isAvoidTag(tag)).toBe(false)
  })
})
