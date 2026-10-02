import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockUseIngredients, mockFetch, mockCreate, mockUpdate, mockDelete, mockUploadImage } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUploadImage: vi.fn(),
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
vi.mock('@/api/images', () => ({
  uploadImage: mockUploadImage,
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
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
  alternative_names: ['Reuben sandwich', 'Reubens'],
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

const photo = () => new File(['x'], 'reuben.jpg', { type: 'image/jpeg' })

describe('DatabaseManagementPage photo', () => {
  it('uploads a photo to the sandwich images and saves its URL with the entry', async () => {
    mockUploadImage.mockResolvedValue('https://cdn.example.com/sandwich-images/reuben.jpg')
    mockUpdate.mockResolvedValue(reuben)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))
    const file = photo()

    await user.upload(screen.getByLabelText('Upload photo'), file)

    expect(mockUploadImage).toHaveBeenCalledWith({ bucket: 'sandwich-images', file })
    await waitFor(() => { expect(screen.getByLabelText('Image URL')).toHaveValue('https://cdn.example.com/sandwich-images/reuben.jpg') })
    expect(screen.getByAltText('Photo preview')).toHaveAttribute('src', 'https://cdn.example.com/sandwich-images/reuben.jpg')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      'token-abc',
      'reuben',
      expect.objectContaining({ image_url: 'https://cdn.example.com/sandwich-images/reuben.jpg' }),
    )
  })

  it('shows the current photo when editing an entry that has one', async () => {
    mockFetch.mockResolvedValue([{ ...reuben, image_url: 'https://cdn.example.com/old.jpg' }])
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    expect(screen.getByAltText('Photo preview')).toHaveAttribute('src', 'https://cdn.example.com/old.jpg')
  })

  it('shows no preview when there is no photo', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    expect(screen.queryByAltText('Photo preview')).not.toBeInTheDocument()
  })

  it('shows the reason and keeps the old URL when the photo is rejected', async () => {
    mockFetch.mockResolvedValue([{ ...reuben, image_url: 'https://cdn.example.com/old.jpg' }])
    mockUploadImage.mockRejectedValue(new Error('Images must be 5MB or smaller.'))
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.upload(screen.getByLabelText('Upload photo'), photo())

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Images must be 5MB or smaller.') })
    expect(screen.getByLabelText('Image URL')).toHaveValue('https://cdn.example.com/old.jpg')
  })

  it('cannot be saved while a photo is still uploading', async () => {
    mockUploadImage.mockReturnValue(new Promise(() => undefined))
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.upload(screen.getByLabelText('Upload photo'), photo())

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByLabelText('Upload photo')).toBeDisabled()
  })
})

describe('DatabaseManagementPage alternative names', () => {
  it('shows the entry alternative names in one comma separated box', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    expect(screen.getByLabelText('Alternative names')).toHaveValue('Reuben sandwich, Reubens')
  })

  it('saves the alternative names as a trimmed list without blanks or repeats', async () => {
    mockUpdate.mockResolvedValue(reuben)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.clear(screen.getByLabelText('Alternative names'))
    await user.type(screen.getByLabelText('Alternative names'), 'Cheese toastie,  Cheese jaffle ,, Cheese toastie')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      'token-abc',
      'reuben',
      expect.objectContaining({ alternative_names: ['Cheese toastie', 'Cheese jaffle'] }),
    )
  })

  it('saves an empty list when the box is cleared', async () => {
    mockUpdate.mockResolvedValue(reuben)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.clear(screen.getByLabelText('Alternative names'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'reuben', expect.objectContaining({ alternative_names: [] }))
  })

  it('starts empty for a new entry and sends an empty list if left blank', async () => {
    mockCreate.mockResolvedValue({ ...reuben, id: 's-9', name: 'Cubano', slug: 'cubano' })
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Add Sandwich' }))

    expect(screen.getByLabelText('Alternative names')).toHaveValue('')
    await user.type(screen.getByLabelText('Name'), 'Cubano')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate).toHaveBeenCalledWith('token-abc', expect.objectContaining({ alternative_names: [] }))
  })
})

describe('DatabaseManagementPage dietary tags', () => {
  it('offers every supported dietary tag by its label', async () => {
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Add Sandwich' }))

    for (const label of ['Vegan', 'Vegetarian', 'Pescatarian', 'Dairy-Free', 'Gluten-Free', 'Contains Pork', 'Contains Shellfish', 'Contains Peanuts']) {
      expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument()
    }
  })

  it('saves the selected dietary tags', async () => {
    mockUpdate.mockResolvedValue(reuben)
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Reuben' }))

    await user.click(screen.getByRole('checkbox', { name: 'Contains Shellfish' }))
    await user.click(screen.getByRole('checkbox', { name: 'Pescatarian' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith(
      'token-abc',
      'reuben',
      expect.objectContaining({ dietary_tags: ['contains_shellfish', 'pescatarian'] }),
    )
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

describe('DatabaseManagementPage sorting and filtering', () => {
  const sandwich = (overrides: Record<string, unknown>) => ({ ...reuben, alternative_names: [], ...overrides })
  const all = [
    sandwich({ id: 's-1', name: 'Reuben', slug: 'reuben', origin_country: 'United States', origin_region: 'Americas', published: false, avg_rating: 4.5 }),
    sandwich({ id: 's-2', name: 'Banh Mi', slug: 'banh-mi', origin_country: 'Vietnam', origin_region: 'Asia', published: true, avg_rating: 4 }),
    sandwich({ id: 's-3', name: 'Cubano', slug: 'cubano', origin_country: 'United States', origin_region: 'Americas', published: false, avg_rating: null, alternative_names: ['Cuban sandwich', 'Mixto'] }),
    sandwich({ id: 's-4', name: 'Croque Monsieur', slug: 'croque-monsieur', origin_country: 'France', origin_region: 'Europe', published: true, avg_rating: 5 }),
  ]

  const names = (): string[] =>
    screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '')

  const renderList = async () => {
    mockFetch.mockResolvedValue(all)
    render(<DatabaseManagementPage />)
    await screen.findByText('Reuben')
  }

  it('lists sandwiches by name to start with', async () => {
    await renderList()

    expect(names()).toEqual(['Banh Mi', 'Croque Monsieur', 'Cubano', 'Reuben'])
    expect(screen.getByText('Showing 4 of 4 sandwiches')).toBeInTheDocument()
  })

  it('searches by name without regard to case', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'CRO')

    expect(names()).toEqual(['Croque Monsieur'])
    expect(screen.getByText('Showing 1 of 4 sandwiches')).toBeInTheDocument()
  })

  it('also searches the alternative names', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'mixto')

    expect(names()).toEqual(['Cubano'])
  })

  it('filters by region', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by region' }), 'Americas')

    expect(names()).toEqual(['Cubano', 'Reuben'])
  })

  it('filters by whether the sandwich is published', async () => {
    const user = userEvent.setup()
    await renderList()
    const status = screen.getByRole('combobox', { name: 'Filter by status' })

    await user.selectOptions(status, 'Published')
    expect(names()).toEqual(['Banh Mi', 'Croque Monsieur'])

    await user.selectOptions(status, 'Unpublished')
    expect(names()).toEqual(['Cubano', 'Reuben'])
  })

  it('combines the search and the filters', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by region' }), 'Americas')
    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'reub')

    expect(names()).toEqual(['Reuben'])
  })

  it('says so when nothing matches and offers to clear the filters', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'zzz')
    expect(screen.getByText('No sandwiches match these filters.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(names()).toHaveLength(4)
  })

  it('sorts by rating with unrated sandwiches last in both directions', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: 'Sort by Rating' }))
    expect(names()).toEqual(['Banh Mi', 'Reuben', 'Croque Monsieur', 'Cubano'])

    await user.click(screen.getByRole('button', { name: 'Sort by Rating' }))
    expect(names()).toEqual(['Croque Monsieur', 'Reuben', 'Banh Mi', 'Cubano'])
  })

  it('sorts by region, keeping name order within a region', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: 'Sort by Region' }))

    expect(names()).toEqual(['Cubano', 'Reuben', 'Banh Mi', 'Croque Monsieur'])
  })

  it('sorts by country', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: 'Sort by Country' }))

    expect(names()).toEqual(['Croque Monsieur', 'Cubano', 'Reuben', 'Banh Mi'])
  })

  it('sorts by published, with unpublished first', async () => {
    const user = userEvent.setup()
    await renderList()

    await user.click(screen.getByRole('button', { name: 'Sort by Published' }))

    expect(names()).toEqual(['Cubano', 'Reuben', 'Banh Mi', 'Croque Monsieur'])
  })

  it('shows which column the list is sorted by', async () => {
    const user = userEvent.setup()
    await renderList()

    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending')

    await user.click(screen.getByRole('button', { name: 'Sort by Region' }))

    expect(screen.getByRole('columnheader', { name: /Region/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('keeps the search and sort after opening and closing an edit form', async () => {
    const user = userEvent.setup()
    await renderList()
    await user.type(screen.getByRole('searchbox', { name: 'Search sandwiches' }), 'c')
    await user.click(screen.getByRole('button', { name: 'Sort by Region' }))

    await user.click(screen.getByRole('button', { name: 'Edit Cubano' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('searchbox', { name: 'Search sandwiches' })).toHaveValue('c')
    expect(names()).toEqual(['Cubano', 'Croque Monsieur'])
  })
})
