import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockUseAuth, mockPrompt, mockFetchPhotos } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockPrompt: vi.fn(),
  mockFetchPhotos: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/context/AuthPromptContext', () => ({ useAuthPrompt: () => ({ prompt: mockPrompt }) }))
vi.mock('@/api/sandwichPage', () => ({ fetchPhotos: mockFetchPhotos }))
vi.mock('@/components/sandwich-page/PhotoUpload', () => ({
  default: ({ onUploaded }: { onUploaded: (photo: unknown) => void }) => (
    <button onClick={() => { onUploaded({ id: 'new-1' }) }}>Mock upload success</button>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import PhotoGallery from '@/components/sandwich-page/PhotoGallery'

const loggedInAuth = { user: { id: 'user-1' }, session: { access_token: 'token-abc' } }
const guestAuth = { user: null, session: null }

const makePhoto = (overrides: Partial<{ id: string; caption: string | null; signed_url: string | null }> = {}) => ({
  id: 'p1',
  user_id: 'user-2',
  caption: 'Yum',
  created_at: '2026-01-01T00:00:00Z',
  signed_url: 'https://signed/a.jpg',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(loggedInAuth)
})

describe('PhotoGallery', () => {
  it('shows a loading state before photos arrive', () => {
    mockFetchPhotos.mockReturnValue(new Promise(() => {}))
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)
    expect(screen.getByText(/loading photos/i)).toBeInTheDocument()
  })

  it('renders photo thumbnails after loading', async () => {
    mockFetchPhotos.mockResolvedValue({ data: [makePhoto()], meta: { total_count: 1, limit: 20, offset: 0 } })
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByRole('img', { name: 'Yum' })).toBeInTheDocument() })
  })

  it('shows an empty state when there are no photos', async () => {
    mockFetchPhotos.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText(/be the first to share one/i)).toBeInTheDocument() })
  })

  it('opens a lightbox when a photo is clicked, and closes it', async () => {
    mockFetchPhotos.mockResolvedValue({ data: [makePhoto()], meta: { total_count: 1, limit: 20, offset: 0 } })
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByRole('img', { name: 'Yum' })).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('img', { name: 'Yum' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('prompts for auth when a guest clicks "Upload photo"', async () => {
    mockUseAuth.mockReturnValue(guestAuth)
    mockFetchPhotos.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText(/be the first to share one/i)).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /upload photo/i }))

    expect(mockPrompt).toHaveBeenCalledWith('upload a photo')
    expect(screen.queryByText('Mock upload success')).not.toBeInTheDocument()
  })

  it('shows the upload panel for an authenticated user, and closes it after a successful upload', async () => {
    mockFetchPhotos.mockResolvedValue({ data: [], meta: { total_count: 0, limit: 20, offset: 0 } })
    render(<PhotoGallery targetType="database" slug="reuben" targetId="target-1" />)

    await waitFor(() => { expect(screen.getByText(/be the first to share one/i)).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /upload photo/i }))

    const uploadTrigger = screen.getByText('Mock upload success')
    expect(uploadTrigger).toBeInTheDocument()

    await userEvent.click(uploadTrigger)
    expect(screen.queryByText('Mock upload success')).not.toBeInTheDocument()
  })
})
