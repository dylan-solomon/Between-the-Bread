import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')

const contentOf = (attribute: 'property' | 'name', key: string): string | undefined =>
  new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="([^"]*)"`).exec(html)?.[1]

describe('index.html default share tags', () => {
  it('points the Open Graph and Twitter images at the generated default card', () => {
    expect(contentOf('property', 'og:image')).toBe('https://betweenbread.co/api/og/default')
    expect(contentOf('name', 'twitter:image')).toBe('https://betweenbread.co/api/og/default')
  })

  it('declares the size of the Open Graph image', () => {
    expect(contentOf('property', 'og:image:width')).toBe('1200')
    expect(contentOf('property', 'og:image:height')).toBe('630')
  })

  it('no longer references the missing og-image.png', () => {
    expect(html).not.toContain('og-image.png')
  })
})
