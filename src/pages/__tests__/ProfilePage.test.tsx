import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

const { mockFetchProfile } = vi.hoisted(() => ({ mockFetchProfile: vi.fn() }))

vi.mock('@/api/profiles', () => ({ fetchPublicProfile: mockFetchProfile }))

import ProfilePage from '@/pages/ProfilePage'
import { accessibilityProblems } from '@/test/accessibility'

const makeProfile = (overrides: Record<string, unknown> = {}) => ({
  username: 'deli_dan',
  is_admin: false,
  joined_at: '2026-09-01T12:00:00Z',
  comment_count: 7,
  ...overrides,
})

const renderAt = (username = 'deli_dan') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/u/${username}`]}>
        <Routes>
          <Route path="/u/:username" element={<ProfilePage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchProfile.mockResolvedValue(makeProfile())
})

describe('ProfilePage', () => {
  it('shows a loading state while fetching', () => {
    mockFetchProfile.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument()
  })

  it('shows the username, when they joined and how many comments they have made', async () => {
    renderAt()

    expect(await screen.findByRole('heading', { level: 1, name: '@deli_dan' })).toBeInTheDocument()
    expect(screen.getByText('Joined September 2026')).toBeInTheDocument()
    expect(screen.getByText('7 comments')).toBeInTheDocument()
    expect(mockFetchProfile).toHaveBeenCalledWith('deli_dan')
  })

  it.each([
    [1, '1 comment'],
    [0, 'No comments yet'],
  ])('describes %i comments as "%s"', async (count, text) => {
    mockFetchProfile.mockResolvedValue(makeProfile({ comment_count: count }))
    renderAt()

    expect(await screen.findByText(text)).toBeInTheDocument()
  })

  it('tags admins', async () => {
    mockFetchProfile.mockResolvedValue(makeProfile({ is_admin: true }))
    renderAt()

    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('does not tag other people', async () => {
    renderAt()

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('titles the page with the username and keeps it out of search results', async () => {
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    await waitFor(() => {
      expect(document.title).toBe('@deli_dan | Between the Bread')
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    })
  })

  it('says when nobody has that username', async () => {
    mockFetchProfile.mockResolvedValue(null)
    renderAt('nobody_here')

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile not found' })).toBeInTheDocument()
  })

  it('says when the profile could not be loaded', async () => {
    mockFetchProfile.mockRejectedValue(new Error('offline'))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading this profile.')
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    renderAt()
    await screen.findByRole('heading', { level: 1 })

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
