import { describe, it, expect } from 'vitest'
import { AVOID_TAGS, DIETARY_TAGS, isAvoidTag, isDietaryTag, matchesDiet } from '../dietaryTags.js'
import { DIETARY_TAGS as APP_TAGS } from '../../../src/data/dietaryTags'

describe('dietary tags shared with the app', () => {
  it('lists exactly the tags the app defines, in the same order', () => {
    expect([...DIETARY_TAGS]).toEqual(APP_TAGS.map((t) => t.tag))
  })

  it('treats exactly the app avoid tags as avoid tags', () => {
    expect([...AVOID_TAGS]).toEqual(APP_TAGS.filter((t) => t.kind === 'avoid').map((t) => t.tag))
  })
})

describe('isDietaryTag', () => {
  it('accepts supported tags and rejects anything else', () => {
    expect(isDietaryTag('pescatarian')).toBe(true)
    expect(isDietaryTag('contains_peanuts')).toBe(true)
    expect(isDietaryTag('keto')).toBe(false)
    expect(isDietaryTag('gluten-free')).toBe(false)
  })
})

describe('isAvoidTag', () => {
  it('is true only for contains tags', () => {
    expect(isAvoidTag('contains_pork')).toBe(true)
    expect(isAvoidTag('vegan')).toBe(false)
  })
})

describe('matchesDiet', () => {
  it('requires every must-have tag', () => {
    expect(matchesDiet(['vegan', 'gluten_free'], ['vegan', 'gluten_free'])).toBe(true)
    expect(matchesDiet(['vegan'], ['vegan', 'gluten_free'])).toBe(false)
  })

  it('rejects anything carrying an avoided tag', () => {
    expect(matchesDiet(['contains_pork'], ['contains_pork'])).toBe(false)
    expect(matchesDiet(['dairy_free'], ['contains_pork'])).toBe(true)
  })

  it('combines must-have and avoid tags', () => {
    expect(matchesDiet(['pescatarian', 'contains_shellfish'], ['pescatarian', 'contains_shellfish'])).toBe(false)
    expect(matchesDiet(['pescatarian'], ['pescatarian', 'contains_shellfish'])).toBe(true)
  })

  it('treats unknown tags as must-have so they match nothing', () => {
    expect(matchesDiet(['vegan'], ['keto'])).toBe(false)
  })

  it('matches everything when no tags are active', () => {
    expect(matchesDiet([], [])).toBe(true)
  })
})
