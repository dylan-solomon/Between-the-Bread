import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockFetch, mockCreate, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetch: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/admin', () => ({
  fetchBlogCategories: mockFetch,
  createBlogCategory: mockCreate,
  updateBlogCategory: mockUpdate,
  deleteBlogCategory: mockDelete,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import BlogCategoriesPage from '@/pages/admin/BlogCategoriesPage'

const makeCategory = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  slug: 'sandwich-ideas',
  name: 'Sandwich Ideas',
  description: null,
  display_order: 1,
  post_count: 2,
  ...overrides,
})

const ideas = makeCategory()
const pairings = makeCategory({ id: 'c-2', slug: 'best-pairings', name: 'Best Pairings', description: 'What goes with what', display_order: 2, post_count: 0 })
const dietary = makeCategory({ id: 'c-3', slug: 'dietary', name: 'Dietary', display_order: 3, post_count: 0 })

const rowNames = (): string[] =>
  screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)

const renderPage = async () => {
  render(<BlogCategoriesPage />)
  await screen.findByText('Sandwich Ideas')
}

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockFetch.mockResolvedValue([ideas, pairings, dietary])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('BlogCategoriesPage list', () => {
  it('lists the categories in order with their slug, description and post count', async () => {
    await renderPage()

    expect(rowNames()).toEqual(['Sandwich Ideas', 'Best Pairings', 'Dietary'])
    const row = screen.getByRole('row', { name: /Best Pairings/ })
    expect(within(row).getByText('best-pairings')).toBeInTheDocument()
    expect(within(row).getByText('What goes with what')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /Sandwich Ideas/ })).getByText('2')).toBeInTheDocument()
  })

  it('loads the categories with the session token', async () => {
    await renderPage()

    expect(mockFetch).toHaveBeenCalledWith('token-abc')
  })

  it('shows an empty message when there are no categories', async () => {
    mockFetch.mockResolvedValue([])
    render(<BlogCategoriesPage />)

    expect(await screen.findByText('No categories yet.')).toBeInTheDocument()
  })

  it('shows an error when the categories cannot be loaded', async () => {
    mockFetch.mockRejectedValue(new Error('nope'))
    render(<BlogCategoriesPage />)

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to load blog categories.') })
  })
})

describe('BlogCategoriesPage adding', () => {
  it('adds a category and shows it at the end of the list', async () => {
    mockCreate.mockResolvedValue(makeCategory({ id: 'c-4', slug: 'seasonal', name: 'Seasonal', display_order: 4, post_count: 0 }))
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('New category name'), 'Seasonal')
    await user.type(screen.getByLabelText('New category description'), 'Holiday builds')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(mockCreate).toHaveBeenCalledWith('token-abc', { name: 'Seasonal', description: 'Holiday builds' })
    expect(await screen.findByText('seasonal')).toBeInTheDocument()
    expect(rowNames().at(-1)).toBe('Seasonal')
    expect(screen.getByLabelText('New category name')).toHaveValue('')
    expect(toast.success).toHaveBeenCalledWith('Category added.')
  })

  it('does not send a blank description', async () => {
    mockCreate.mockResolvedValue(makeCategory({ id: 'c-4', slug: 'seasonal', name: 'Seasonal', display_order: 4 }))
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('New category name'), 'Seasonal')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    expect(mockCreate).toHaveBeenCalledWith('token-abc', { name: 'Seasonal', description: null })
  })

  it('cannot add a category without a name', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Add category' })).toBeDisabled()
  })

  it('explains when a category with the same slug already exists', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('conflict'), { code: 'SLUG_TAKEN' }))
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('New category name'), 'Dietary')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('A category with that name already exists.') })
    expect(screen.getByLabelText('New category name')).toHaveValue('Dietary')
  })

  it('shows a general error when adding fails', async () => {
    mockCreate.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('New category name'), 'Seasonal')
    await user.click(screen.getByRole('button', { name: 'Add category' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to add category.') })
  })
})

describe('BlogCategoriesPage editing', () => {
  it('renames a category and edits its description', async () => {
    mockUpdate.mockResolvedValue({ ...dietary, name: 'Diets', description: 'Vegan and more' })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Dietary' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Diets')
    await user.type(screen.getByLabelText('Description'), 'Vegan and more')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'dietary', { name: 'Diets', description: 'Vegan and more' })
    expect(await screen.findByText('Diets')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Category saved.')
  })

  it('leaves the category unchanged when editing is cancelled', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Dietary' }))
    await user.type(screen.getByLabelText('Name'), ' extra')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Dietary')).toBeInTheDocument()
  })

  it('cannot save a blank name', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Dietary' }))
    await user.clear(screen.getByLabelText('Name'))

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows an error and keeps editing when saving fails', async () => {
    mockUpdate.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Edit Dietary' }))
    await user.type(screen.getByLabelText('Name'), 's')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to save category.') })
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })
})

describe('BlogCategoriesPage reordering', () => {
  it('moves a category down by swapping its position with the next one', async () => {
    mockUpdate.mockImplementation((_token: string, slug: string, updates: { display_order: number }) =>
      Promise.resolve({ ...(slug === 'sandwich-ideas' ? ideas : pairings), ...updates }),
    )
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Move Sandwich Ideas down' }))

    await waitFor(() => { expect(rowNames()).toEqual(['Best Pairings', 'Sandwich Ideas', 'Dietary']) })
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'sandwich-ideas', { display_order: 2 })
    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'best-pairings', { display_order: 1 })
  })

  it('moves a category up', async () => {
    mockUpdate.mockImplementation((_token: string, slug: string, updates: { display_order: number }) =>
      Promise.resolve({ ...(slug === 'dietary' ? dietary : pairings), ...updates }),
    )
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Move Dietary up' }))

    await waitFor(() => { expect(rowNames()).toEqual(['Sandwich Ideas', 'Dietary', 'Best Pairings']) })
  })

  it('renumbers categories that share the same order so a move always has an effect', async () => {
    mockFetch.mockResolvedValue([
      makeCategory({ display_order: 0 }),
      makeCategory({ id: 'c-2', slug: 'best-pairings', name: 'Best Pairings', display_order: 0 }),
    ])
    mockUpdate.mockImplementation((_token: string, slug: string, updates: { display_order: number }) =>
      Promise.resolve({ ...(slug === 'sandwich-ideas' ? ideas : pairings), ...updates }),
    )
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Move Sandwich Ideas down' }))

    await waitFor(() => { expect(rowNames()).toEqual(['Best Pairings', 'Sandwich Ideas']) })
  })

  it('cannot move the first category up or the last one down', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Move Sandwich Ideas up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Dietary down' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Best Pairings up' })).toBeEnabled()
  })

  it('keeps the old order and shows an error when reordering fails', async () => {
    mockUpdate.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Move Sandwich Ideas down' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to reorder categories.') })
    expect(rowNames()).toEqual(['Sandwich Ideas', 'Best Pairings', 'Dietary'])
  })
})

describe('BlogCategoriesPage deleting', () => {
  it('offers delete only for categories with no posts', async () => {
    await renderPage()

    expect(screen.queryByRole('button', { name: 'Delete Sandwich Ideas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Best Pairings' })).toBeInTheDocument()
  })

  it('deletes a category after confirmation', async () => {
    mockDelete.mockResolvedValue({ slug: 'dietary', deleted: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Dietary' }))

    expect(window.confirm).toHaveBeenCalledWith('Delete the category "Dietary"? This cannot be undone.')
    expect(mockDelete).toHaveBeenCalledWith('token-abc', 'dietary')
    await waitFor(() => { expect(rowNames()).toEqual(['Sandwich Ideas', 'Best Pairings']) })
    expect(toast.success).toHaveBeenCalledWith('Category deleted.')
  })

  it('does nothing when the confirmation is declined', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Dietary' }))

    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.getByText('Dietary')).toBeInTheDocument()
  })

  it('explains when a post started using the category in the meantime', async () => {
    mockDelete.mockRejectedValue(Object.assign(new Error('conflict'), { code: 'CATEGORY_IN_USE' }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Dietary' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('That category is used by posts, so it cannot be deleted.') })
    expect(screen.getByText('Dietary')).toBeInTheDocument()
  })

  it('shows a general error when deleting fails', async () => {
    mockDelete.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Dietary' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to delete category.') })
  })
})
