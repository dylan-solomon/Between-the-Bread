import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockUseIngredients, mockFetch, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseIngredients: vi.fn(),
  mockFetch: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))
vi.mock('@/api/admin', () => ({
  fetchAdminSandwiches: mockFetch,
  createSandwich: mockCreate,
  updateSandwich: mockUpdate,
  deleteSandwich: mockDelete,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import DatabaseManagementPage from '@/pages/admin/DatabaseManagementPage'

const reuben = {
  id: 's-1',
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef on rye.',
  history: 'Origin **story**.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }], protein: [{ name: 'Corned Beef' }, { name: 'Pastrami' }] },
  dietary_tags: [],
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
  published: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const banhMi = { ...reuben, id: 's-2', name: 'Banh Mi', slug: 'banh-mi', origin_country: 'Vietnam', origin_region: 'Asia', published: true }

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockUseIngredients.mockReturnValue({
    categories: [
      { id: 'c1', name: 'Bread', slug: 'bread' },
      { id: 'c2', name: 'Protein', slug: 'protein' },
    ],
    pools: {}, loading: false, error: null,
  })
  mockFetch.mockResolvedValue([reuben, banhMi])
})

const renderPage = async () => {
  render(<DatabaseManagementPage />)
  await screen.findByText('Reuben')
}

describe('DatabaseManagementPage list', () => {
  it('lists every entry with its region and published status', async () => {
    await renderPage()

    const reubenRow = screen.getByRole('row', { name: /Reuben/ })
    expect(within(reubenRow).getByText('Americas')).toBeInTheDocument()
    expect(within(reubenRow).getByRole('checkbox', { name: 'Published: Reuben' })).not.toBeChecked()
    expect(within(screen.getByRole('row', { name: /Banh Mi/ })).getByRole('checkbox', { name: 'Published: Banh Mi' })).toBeChecked()
  })

  it('loads entries using the session token', async () => {
    await renderPage()

    expect(mockFetch).toHaveBeenCalledWith('token-abc')
  })

  it('shows an error toast when loading fails', async () => {
    mockFetch.mockRejectedValue(new Error('boom'))
    render(<DatabaseManagementPage />)

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to load sandwiches.') })
  })

  it('publishes an entry from the list', async () => {
    mockUpdate.mockResolvedValue({ ...reuben, published: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('checkbox', { name: 'Published: Reuben' }))

    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'reuben', { published: true })
    await waitFor(() => { expect(screen.getByRole('checkbox', { name: 'Published: Reuben' })).toBeChecked() })
  })

  it('shows an error toast and keeps the old status when publishing fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('checkbox', { name: 'Published: Reuben' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to save sandwich.') })
    expect(screen.getByRole('checkbox', { name: 'Published: Reuben' })).not.toBeChecked()
  })
})

describe('DatabaseManagementPage editing', () => {
  it('opens the edit form with the entry values', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    expect(screen.getByLabelText('Name')).toHaveValue('Reuben')
    expect(screen.getByLabelText('Slug')).toHaveValue('reuben')
    expect(screen.getByLabelText('Description')).toHaveValue('Corned beef on rye.')
    expect(screen.getByLabelText('Country')).toHaveValue('United States')
    expect(screen.getByLabelText('Region')).toHaveValue('Americas')
    expect(screen.getByLabelText('Protein ingredients')).toHaveValue('Corned Beef, Pastrami')
  })

  it('saves edits by the original slug and returns to the list', async () => {
    mockUpdate.mockResolvedValue({ ...reuben, description: 'Updated.' })
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), 'Updated.')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      'token-abc',
      'reuben',
      expect.objectContaining({ description: 'Updated.', name: 'Reuben' }),
    )
    await screen.findByRole('button', { name: 'Edit Reuben' })
    expect(toast.success).toHaveBeenCalledWith('Sandwich saved.')
  })

  it('turns comma separated ingredient names into category lists', async () => {
    mockUpdate.mockResolvedValue(reuben)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.clear(screen.getByLabelText('Protein ingredients'))
    await user.type(screen.getByLabelText('Protein ingredients'), 'Turkey,  Ham ,')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      'token-abc',
      'reuben',
      expect.objectContaining({
        canonical_ingredients: { bread: [{ name: 'Rye' }], protein: [{ name: 'Turkey' }, { name: 'Ham' }] },
      }),
    )
  })

  it('previews the history as formatted markdown', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.click(screen.getByRole('button', { name: 'Preview history' }))

    expect(screen.getByText('story').tagName).toBe('STRONG')
  })

  it('stays on the form and shows an error when saving fails', async () => {
    mockUpdate.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to save sandwich.') })
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('returns to the list without saving when cancelled', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('button', { name: 'Edit Reuben' })).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('DatabaseManagementPage creating', () => {
  it('suggests a slug from the name', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Add Sandwich' }))

    await user.type(screen.getByLabelText('Name'), 'Philly Cheesesteak')

    expect(screen.getByLabelText('Slug')).toHaveValue('philly-cheesesteak')
  })

  it('creates the entry and adds it to the list', async () => {
    const created = { ...reuben, id: 's-3', name: 'Cubano', slug: 'cubano' }
    mockCreate.mockResolvedValue(created)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Add Sandwich' }))

    await user.type(screen.getByLabelText('Name'), 'Cubano')
    await user.selectOptions(screen.getByLabelText('Region'), 'Americas')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate).toHaveBeenCalledWith(
      'token-abc',
      expect.objectContaining({ name: 'Cubano', slug: 'cubano', origin_region: 'Americas' }),
    )
    await screen.findByText('Cubano')
    expect(toast.success).toHaveBeenCalledWith('Sandwich saved.')
  })

  it('requires a name and slug before saving', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Add Sandwich' }))

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Name and slug are required.')
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('DatabaseManagementPage deleting', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('only offers delete for unpublished entries', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Delete Reuben' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Banh Mi' })).not.toBeInTheDocument()
  })

  it('deletes an entry after the admin confirms', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    mockDelete.mockResolvedValue({ slug: 'reuben', deleted: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Reuben' }))

    expect(mockDelete).toHaveBeenCalledWith('token-abc', 'reuben')
    await waitFor(() => { expect(screen.queryByText('Reuben')).not.toBeInTheDocument() })
    expect(screen.getByText('Banh Mi')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Sandwich deleted.')
  })

  it('names the entry and warns about lost ratings, comments and photos in the confirmation', async () => {
    const confirm = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', confirm)
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Reuben' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Reuben'))
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/ratings, comments and photos/))
  })

  it('keeps the entry when the admin cancels', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Reuben' }))

    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Reuben')).toBeInTheDocument()
  })

  it('keeps the entry and shows an error when deleting fails', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    mockDelete.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Reuben' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to delete sandwich.') })
    expect(screen.getByText('Reuben')).toBeInTheDocument()
  })
})
