import { describe, it, expect } from 'vitest'
import { TooManyRequestsError, failureFrom } from '@/api/errors'

const response = (status: number, body: unknown): Response =>
  ({ status, ok: status < 400, json: () => Promise.resolve(body) }) as unknown as Response

describe('failureFrom', () => {
  it('explains a too-many-requests answer in the server\'s words', async () => {
    const error = await failureFrom(response(429, { error: { message: "You're rating too quickly." } }), 'Failed to rate')

    expect(error).toBeInstanceOf(TooManyRequestsError)
    expect(error.message).toBe("You're rating too quickly.")
  })

  it('falls back to a general wait message when the server gives none', async () => {
    const error = await failureFrom(response(429, {}), 'Failed to rate')

    expect(error).toBeInstanceOf(TooManyRequestsError)
    expect(error.message).toBe("You're going a bit fast. Please wait a moment and try again.")
  })

  it('reports other failures with their status', async () => {
    const error = await failureFrom(response(500, {}), 'Failed to rate')

    expect(error).not.toBeInstanceOf(TooManyRequestsError)
    expect(error.message).toBe('Failed to rate: 500')
  })
})
