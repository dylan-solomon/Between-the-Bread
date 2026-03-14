import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import SharedSandwich from '@/pages/SharedSandwich'
import { makeComposition } from '@/test/factories'

const { mockFetchShare, mockCaptureVisited, mockCaptureCta } = vi.hoisted(() => ({
  mockFetchShare: vi.fn(),
  mockCaptureVisited: vi.fn(),
  mockCaptureCta: vi.fn(),
}))

vi.mock('@/api/shareApi', () => ({ fetchShare: mockFetchShare }))
vi.mock('@/analytics/events', () => ({
  captureShareLinkVisited: mockCaptureVisited,
  captureShareMakeYourOwnClicked: mockCaptureCta,
}))

const stubRecord = {
  hash: 'abc12345',
  name: 'The Club',
  composition: makeComposition(),
}

const renderAtHash = (hash = 'abc12345') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/s/${hash}`]}>
        <Routes>
          <Route path="/s/:hash" element={<SharedSandwich />} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  mockFetchShare.mockReset()
  mockCaptureVisited.mockReset()
  mockCaptureCta.mockReset()
})

describe('SharedSandwich page', () => {
  it('shows a loading state while fetching', () => {
    mockFetchShare.mockReturnValue(new Promise(() => undefined))
    renderAtHash()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the sandwich name once loaded', async () => {
    mockFetchShare.mockResolvedValue(stubRecord)
    renderAtHash()
    await waitFor(() => { expect(screen.getByRole('heading')).toBeInTheDocument() })
  })

  it('renders a "Make Your Own" CTA link to /', async () => {
    mockFetchShare.mockResolvedValue(stubRecord)
    renderAtHash()
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /make your own/i })).toHaveAttribute('href', '/')
    })
  })

  it('fires captureShareLinkVisited on successful load', async () => {
    mockFetchShare.mockResolvedValue(stubRecord)
    renderAtHash()
    await waitFor(() => {
      expect(mockCaptureVisited).toHaveBeenCalledWith({
        hash: 'abc12345',
        sandwichName: 'The Club',
      })
    })
  })

  it('fires captureShareMakeYourOwnClicked when CTA is clicked', async () => {
    mockFetchShare.mockResolvedValue(stubRecord)
    renderAtHash()
    await waitFor(() => screen.getByRole('link', { name: /make your own/i }))
    await userEvent.click(screen.getByRole('link', { name: /make your own/i }))
    expect(mockCaptureCta).toHaveBeenCalledWith({ sourceHash: 'abc12345' })
  })

  it('shows an error state when fetch fails', async () => {
    mockFetchShare.mockRejectedValue(new Error('404'))
    renderAtHash()
    await waitFor(() => { expect(screen.getByRole('alert')).toBeInTheDocument() })
  })

  it('error state includes a link back to home', async () => {
    mockFetchShare.mockRejectedValue(new Error('404'))
    renderAtHash()
    await waitFor(() => screen.getByRole('alert'))
    expect(screen.getByRole('link', { name: /make your own/i })).toHaveAttribute('href', '/')
  })

  describe('OG meta tags', () => {
    it('sets og:title to the sandwich name once loaded', async () => {
      mockFetchShare.mockResolvedValue(stubRecord)
      renderAtHash()
      await waitFor(() => {
        const ogTitle = document.querySelector('meta[property="og:title"]')
        expect(ogTitle?.getAttribute('content')).toBe('The Club')
      })
    })

    it('sets og:url to the share URL once loaded', async () => {
      mockFetchShare.mockResolvedValue(stubRecord)
      renderAtHash()
      await waitFor(() => {
        const ogUrl = document.querySelector('meta[property="og:url"]')
        expect(ogUrl?.getAttribute('content')).toContain('/s/abc12345')
      })
    })
  })
})
