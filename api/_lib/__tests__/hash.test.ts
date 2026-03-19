import { describe, it, expect } from 'vitest'
import { generateHash } from '../hash.js'

describe('generateHash', () => {
  it('returns an 8-character string', () => {
    expect(generateHash()).toHaveLength(8)
  })

  it('returns only alphanumeric characters', () => {
    expect(generateHash()).toMatch(/^[a-zA-Z0-9]{8}$/)
  })

  it('returns different values on successive calls', () => {
    const hashes = Array.from({ length: 20 }, () => generateHash())
    const unique = new Set(hashes)
    expect(unique.size).toBe(20)
  })
})
