import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf8')

const selectorsWithCursor = (cursor: string): string[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => new RegExp(`cursor:\\s*${cursor};`).test(match[2]))
    .flatMap((match) => match[1].split(','))
    .map((selector) => selector.trim().replace(/\s+/g, ' '))

describe('global cursor styles', () => {
  const pointer = selectorsWithCursor('pointer')

  it.each([
    'button:not(:disabled)',
    "[role='tab']:not([aria-disabled='true'])",
    "[role='switch']:not(:disabled)",
    "input[type='checkbox']:not(:disabled)",
    "input[type='radio']:not(:disabled)",
    'select:not(:disabled)',
    'summary',
  ])('shows a pointer over %s', (selector) => {
    expect(pointer).toContain(selector)
  })

  it('shows a pointer over the label of a checkbox or radio button', () => {
    expect(pointer).toContain("label:has(input[type='checkbox']:not(:disabled))")
    expect(pointer).toContain("label:has(input[type='radio']:not(:disabled))")
  })

  it('shows a not-allowed cursor over disabled controls', () => {
    const notAllowed = selectorsWithCursor('not-allowed')

    for (const selector of ['button:disabled', "input[type='checkbox']:disabled", 'select:disabled']) {
      expect(notAllowed).toContain(selector)
    }
  })

  it('does not give a pointer to disabled controls', () => {
    expect(pointer.filter((selector) => selector.endsWith(':disabled'))).toEqual([])
  })
})
