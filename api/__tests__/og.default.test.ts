import { describe, it, expect, vi, beforeEach } from 'vitest'

const { created, MockImageResponse } = vi.hoisted(() => {
  const created: { element: unknown; options: { width: number; height: number; headers?: Record<string, string> } }[] = []
  class MockImageResponse {
    readonly status = 200
    readonly headers = { get: (name: string) => (name === 'content-type' ? 'image/png' : null) }
    constructor(element: unknown, options: { width: number; height: number; headers?: Record<string, string> }) {
      created.push({ element, options })
    }
  }
  return { created, MockImageResponse }
})

vi.mock('@vercel/og', () => ({ ImageResponse: MockImageResponse }))

const makeRequest = (method = 'GET') => new Request('https://betweenbread.co/api/og/default', { method })

const textOf = (node: unknown): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join(' ')
  if (typeof node === 'object' && node !== null && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children)
  }
  return ''
}

beforeEach(() => { created.length = 0 })

describe('GET /api/og/default', () => {
  it('returns an image/png response', async () => {
    const { default: handler } = await import('../og/default')

    const res = handler(makeRequest())

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
  })

  it('renders a 1200x630 card', async () => {
    const { default: handler } = await import('../og/default')

    handler(makeRequest())

    expect(created[0]?.options).toMatchObject({ width: 1200, height: 630 })
  })

  it('shows the site name and what the site does', async () => {
    const { default: handler } = await import('../og/default')

    handler(makeRequest())

    const text = textOf(created[0]?.element)
    expect(text).toContain('Between the Bread')
    expect(text).toMatch(/random sandwich generator/i)
  })

  it('lets crawlers and the CDN cache the image', async () => {
    const { default: handler } = await import('../og/default')

    handler(makeRequest())

    expect(created[0]?.options.headers?.['cache-control']).toMatch(/public/)
  })

  it('returns 405 for non-GET requests', async () => {
    const { default: handler } = await import('../og/default')

    const res = handler(makeRequest('POST'))

    expect(res.status).toBe(405)
  })
})
