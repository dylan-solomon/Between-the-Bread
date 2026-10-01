import { describe, it, expect } from 'vitest'
import { readingTimeMinutes } from '../readingTime.js'

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ')

describe('readingTimeMinutes', () => {
  it('is at least one minute, even for an empty body', () => {
    expect(readingTimeMinutes('')).toBe(1)
  })

  it('counts 200 words as one minute', () => {
    expect(readingTimeMinutes(words(200))).toBe(1)
  })

  it('rounds up to the next minute', () => {
    expect(readingTimeMinutes(words(201))).toBe(2)
  })

  it('ignores extra whitespace and line breaks', () => {
    expect(readingTimeMinutes(`${words(150)}\n\n   \n${words(150)}`)).toBe(2)
  })
})
