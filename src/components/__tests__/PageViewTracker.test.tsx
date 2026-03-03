import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom'
import PageViewTracker from '@/components/PageViewTracker'
import * as events from '@/analytics/events'

vi.mock('@/analytics/events')
beforeEach(() => { vi.clearAllMocks() })

const Wrapper = ({ initialPath = '/' }: { initialPath?: string }) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <PageViewTracker />
  </MemoryRouter>
)

const NavigatingWrapper = () => {
  const navigate = useNavigate()
  return (
    <>
      <PageViewTracker />
      <button onClick={() => { void navigate('/about') }}>Go</button>
    </>
  )
}

describe('PageViewTracker', () => {
  it('calls capturePageView on initial render with the current path', () => {
    render(<Wrapper initialPath="/" />)
    expect(events.capturePageView).toHaveBeenCalledWith('/')
  })

  it('calls capturePageView with the correct path when not at root', () => {
    render(<Wrapper initialPath="/about" />)
    expect(events.capturePageView).toHaveBeenCalledWith('/about')
  })

  it('calls capturePageView again when the path changes', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<NavigatingWrapper />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(events.capturePageView).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(events.capturePageView).toHaveBeenCalledTimes(2)
    expect(events.capturePageView).toHaveBeenLastCalledWith('/about')
  })

  it('renders nothing (null)', () => {
    const { container } = render(<Wrapper />)
    expect(container.firstChild).toBeNull()
  })
})
