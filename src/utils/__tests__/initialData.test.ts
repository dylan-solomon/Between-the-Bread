import { describe, it, expect, afterEach } from 'vitest'
import { readInitialData } from '@/utils/initialData'

const isNamed = (value: unknown): value is { name: string } =>
  typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string'

const sendWithPage = (content: string): void => {
  const script = document.createElement('script')
  script.type = 'application/json'
  script.id = 'initial-data'
  script.textContent = content
  document.body.appendChild(script)
}

afterEach(() => { document.getElementById('initial-data')?.remove() })

describe('readInitialData', () => {
  it('returns the content sent with the page for the same address', () => {
    sendWithPage(JSON.stringify({ path: '/blog/vegan-builds', data: { name: 'Vegan builds' } }))

    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toEqual({ name: 'Vegan builds' })
  })

  it('ignores content sent for a different address', () => {
    sendWithPage(JSON.stringify({ path: '/blog/other', data: { name: 'Other' } }))

    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toBeUndefined()
  })

  it('returns nothing when no content was sent with the page', () => {
    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toBeUndefined()
  })

  it('ignores content that is not the expected shape', () => {
    sendWithPage(JSON.stringify({ path: '/blog/vegan-builds', data: { title: 'No name' } }))

    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toBeUndefined()
  })

  it('ignores content that is not valid JSON', () => {
    sendWithPage('{ not json')

    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toBeUndefined()
  })

  it.each([['null'], ['"text"'], ['[]'], ['{"data": {"name": "No path"}}']])('ignores a wrapper of %s', (content) => {
    sendWithPage(content)

    expect(readInitialData({ path: '/blog/vegan-builds', isData: isNamed })).toBeUndefined()
  })
})
