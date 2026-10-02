import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const rewrites = (JSON.parse(readFileSync('vercel.json', 'utf-8')) as { rewrites: { source: string; destination: string }[] }).rewrites

const fallback = rewrites.find((rewrite) => rewrite.destination === '/index.html')
const fallbackMatches = (path: string): boolean => new RegExp(`^${fallback?.source ?? ''}$`).test(path)

describe('single-page-app fallback', () => {
  it('serves the app for page addresses', () => {
    expect(fallbackMatches('/blog/vegan-grilled-cheese')).toBe(true)
    expect(fallbackMatches('/admin/database')).toBe(true)
  })

  it('does not answer a missing script or stylesheet with the app page, so it fails as a plain 404', () => {
    expect(fallbackMatches('/assets/DatabaseManagementPage-OLD123.js')).toBe(false)
  })

  it('leaves the API alone', () => {
    expect(fallbackMatches('/api/health')).toBe(false)
  })
})
