import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }))

vi.mock('@/api/usernames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/usernames')>()),
  checkUsername: mockCheck,
}))

import { useUsernameCheck } from '@/hooks/useUsernameCheck'

const settle = async (ms = 300) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  mockCheck.mockResolvedValue('available')
})

afterEach(() => { vi.useRealTimers() })

describe('useUsernameCheck', () => {
  it('says nothing about an empty box', () => {
    const { result } = renderHook(() => useUsernameCheck({ name: '' }))

    expect(result.current).toEqual({ status: 'idle', message: null })
  })

  it('says nothing when the name is the one the person already has', async () => {
    const { result } = renderHook(() => useUsernameCheck({ name: 'Sandwich_Fan', current: 'sandwich_fan' }))
    await settle()

    expect(result.current.status).toBe('idle')
    expect(mockCheck).not.toHaveBeenCalled()
  })

  it('explains a badly formed name straight away without asking the server', async () => {
    const { result } = renderHook(() => useUsernameCheck({ name: 'a b' }))

    expect(result.current).toEqual({ status: 'invalid', message: 'Use only letters, numbers and underscores.' })
    await settle()
    expect(mockCheck).not.toHaveBeenCalled()
  })

  it('waits for typing to pause before asking the server', async () => {
    const { result, rerender } = renderHook(({ name }) => useUsernameCheck({ name }), { initialProps: { name: 'san' } })
    rerender({ name: 'sand' })
    rerender({ name: 'sandwich' })

    expect(result.current).toEqual({ status: 'checking', message: 'Checking…' })
    await settle(299)
    expect(mockCheck).not.toHaveBeenCalled()

    await settle(1)
    expect(mockCheck).toHaveBeenCalledTimes(1)
    expect(mockCheck).toHaveBeenCalledWith('sandwich')
    expect(result.current).toEqual({ status: 'available', message: 'Available!' })
  })

  it.each([
    ['taken', 'That username is already taken.'],
    ['reserved', "That username isn't available."],
    ['invalid', 'Usernames are 3 to 20 letters, numbers or underscores.'],
  ])('explains a %s answer', async (answer, message) => {
    mockCheck.mockResolvedValue(answer)
    const { result } = renderHook(() => useUsernameCheck({ name: 'sandwich' }))
    await settle()

    expect(result.current).toEqual({ status: answer, message })
  })

  it('says when the check could not be done', async () => {
    mockCheck.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useUsernameCheck({ name: 'sandwich' }))
    await settle()

    expect(result.current).toEqual({ status: 'error', message: "Couldn't check that username. You can still try saving it." })
  })

  it('ignores an answer for a name that has since changed', async () => {
    const answers: ((value: string) => void)[] = []
    mockCheck.mockImplementation(() => new Promise<string>((resolve) => { answers.push(resolve) }))
    const { result, rerender } = renderHook(({ name }) => useUsernameCheck({ name }), { initialProps: { name: 'first' } })
    await settle()
    rerender({ name: 'second' })
    await settle()

    await act(async () => { answers[0]('taken'); await Promise.resolve() })
    expect(result.current.status).toBe('checking')

    await act(async () => { answers[1]('available'); await Promise.resolve() })
    expect(result.current.status).toBe('available')
  })
})
