import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'

vi.mock('@/components/PageViewTracker', () => ({ default: () => null }))

describe('RootLayout', () => {
  it('mounts a sonner Toaster in the DOM', () => {
    render(
      <MemoryRouter>
        <RootLayout />
      </MemoryRouter>,
    )
    expect(document.querySelector('section[aria-label]')).not.toBeNull()
  })
})
