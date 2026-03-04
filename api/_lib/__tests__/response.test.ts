import { describe, it, expect } from 'vitest'
import { ok, err } from '../response'

describe('ok', () => {
  it('wraps data in envelope', () => {
    const result = ok({ foo: 'bar' })
    expect(result.data).toEqual({ foo: 'bar' })
  })

  it('includes a timestamp string in meta', () => {
    const result = ok({ x: 1 })
    expect(typeof result.meta.timestamp).toBe('string')
    expect(() => new Date(result.meta.timestamp)).not.toThrow()
  })

  it('merges extra meta fields', () => {
    const result = ok([1, 2, 3], { count: 3, total: 10 })
    expect(result.meta.count).toBe(3)
    expect(result.meta.total).toBe(10)
  })

  it('timestamp is a valid ISO date string', () => {
    const result = ok(null)
    const parsed = new Date(result.meta.timestamp)
    expect(parsed.toISOString()).toBe(result.meta.timestamp)
  })
})

describe('err', () => {
  it('returns error envelope with code, message, and status', () => {
    const result = err('NOT_FOUND', 'Not found.', 404)
    expect(result.error.code).toBe('NOT_FOUND')
    expect(result.error.message).toBe('Not found.')
    expect(result.error.status).toBe(404)
  })

  it('has no data field', () => {
    const result = err('SERVER_ERROR', 'Internal error.', 500)
    expect('data' in result).toBe(false)
  })
})
