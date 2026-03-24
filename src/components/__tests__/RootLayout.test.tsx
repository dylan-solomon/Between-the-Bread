import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'

vi.mock('@/components/PageViewTracker', () => ({ default: () => null }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}))

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
