import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockOnLCP, mockOnCLS, mockOnTTFB, mockCapturePerformance } = vi.hoisted(() => ({
  mockOnLCP: vi.fn(),
  mockOnCLS: vi.fn(),
  mockOnTTFB: vi.fn(),
  mockCapturePerformance: vi.fn(),
}))

vi.mock('web-vitals', () => ({ onLCP: mockOnLCP, onCLS: mockOnCLS, onTTFB: mockOnTTFB }))
vi.mock('@/analytics/events', () => ({ capturePerformance: mockCapturePerformance }))

import { captureWebVitals } from '@/analytics/performance'

beforeEach(() => { vi.clearAllMocks() })

describe('captureWebVitals', () => {
  it('records page speed once the measuring code has loaded', async () => {
    await captureWebVitals()

    const reportLcp = mockOnLCP.mock.calls[0][0] as (metric: { value: number }) => void
    reportLcp({ value: 1234.6 })

    expect(mockCapturePerformance).toHaveBeenCalledWith(expect.objectContaining({ lcpMs: 1235, cls: null, ttfbMs: null }))
    expect(mockOnCLS).toHaveBeenCalled()
    expect(mockOnTTFB).toHaveBeenCalled()
  })
})
