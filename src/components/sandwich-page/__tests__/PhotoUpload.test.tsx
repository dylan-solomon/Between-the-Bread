import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockResizeImage, mockUpload, mockRegisterPhoto } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockResizeImage: vi.fn(),
  mockUpload: vi.fn(),
  mockRegisterPhoto: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/utils/resizeImage', () => ({ resizeImage: mockResizeImage }))
vi.mock('@/api/sandwichPage', () => ({ registerPhoto: mockRegisterPhoto }))
vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ upload: mockUpload }) } },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import PhotoUpload from '@/components/sandwich-page/PhotoUpload'

const loggedInAuth = { user: { id: 'user-1' }, session: { access_token: 'token-abc' } }

const makeFile = (type = 'image/jpeg'): File => new File(['fake'], 'photo.jpg', { type })

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(loggedInAuth)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

describe('PhotoUpload', () => {
  it('renders a file input and no preview initially', () => {
    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)
    expect(screen.getByLabelText(/choose photo/i)).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /preview/i })).not.toBeInTheDocument()
  })

  it('rejects a file with an unsupported type', async () => {
    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/choose photo/i), { target: { files: [makeFile('application/pdf')] } })

    await waitFor(() => { expect(toast.error).toHaveBeenCalled() })
    expect(mockResizeImage).not.toHaveBeenCalled()
  })

  it('shows a preview and caption input after selecting a valid image', async () => {
    mockResizeImage.mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' }))
    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)

    await userEvent.upload(screen.getByLabelText(/choose photo/i), makeFile())

    await waitFor(() => { expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument() })
    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument()
  })

  it('uploads the resized image and registers the photo record', async () => {
    mockResizeImage.mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' }))
    mockUpload.mockResolvedValue({ error: null })
    const created = { id: 'p1', user_id: 'user-1', caption: 'Yum', created_at: '2026-01-01T00:00:00Z', signed_url: null }
    mockRegisterPhoto.mockResolvedValue(created)
    const onUploaded = vi.fn()

    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={onUploaded} />)
    await userEvent.upload(screen.getByLabelText(/choose photo/i), makeFile())
    await waitFor(() => { expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument() })

    await userEvent.type(screen.getByLabelText(/caption/i), 'Yum')
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }))

    await waitFor(() => { expect(onUploaded).toHaveBeenCalledWith(created) })
    expect(mockUpload).toHaveBeenCalledWith(expect.stringContaining('user-1/'), expect.anything(), expect.objectContaining({ contentType: 'image/jpeg' }))
    expect(mockRegisterPhoto).toHaveBeenCalledWith('token-abc', expect.objectContaining({
      targetType: 'database', slug: 'reuben', targetId: 'target-1', caption: 'Yum',
    }))
    expect(screen.queryByRole('img', { name: /preview/i })).not.toBeInTheDocument()
  })

  it('shows an error toast when the storage upload fails', async () => {
    mockResizeImage.mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' }))
    mockUpload.mockResolvedValue({ error: { message: 'storage error' } })

    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText(/choose photo/i), makeFile())
    await waitFor(() => { expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalled() })
    expect(mockRegisterPhoto).not.toHaveBeenCalled()
  })

  it('shows an error toast when registering the photo record fails', async () => {
    mockResizeImage.mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' }))
    mockUpload.mockResolvedValue({ error: null })
    mockRegisterPhoto.mockRejectedValue(new Error('boom'))

    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText(/choose photo/i), makeFile())
    await waitFor(() => { expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalled() })
  })

  it('clears the preview when Cancel is clicked, without uploading', async () => {
    mockResizeImage.mockResolvedValue(new Blob(['resized'], { type: 'image/jpeg' }))
    render(<PhotoUpload targetType="database" slug="reuben" targetId="target-1" onUploaded={vi.fn()} />)

    await userEvent.upload(screen.getByLabelText(/choose photo/i), makeFile())
    await waitFor(() => { expect(screen.getByRole('img', { name: /preview/i })).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('img', { name: /preview/i })).not.toBeInTheDocument()
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
