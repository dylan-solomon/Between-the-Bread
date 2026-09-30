import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockUseIngredients, mockFetchAdminIngredients, mockUpdateIngredient, mockCreateIngredient } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseIngredients: vi.fn(),
  mockFetchAdminIngredients: vi.fn(),
  mockUpdateIngredient: vi.fn(),
  mockCreateIngredient: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))
vi.mock('@/api/admin', () => ({
  fetchAdminIngredients: mockFetchAdminIngredients,
  updateIngredient: mockUpdateIngredient,
  createIngredient: mockCreateIngredient,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import IngredientsPage from '@/pages/admin/IngredientsPage'

const ingredient1 = {
  id: 'ing-1',
  category_id: 'cat-1',
  name: 'Sourdough',
  slug: 'sourdough',
  dietary_tags: ['vegetarian', 'vegan'],
  compat_group: 'neutral',
  estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 },
  nutrition: { calories: 120, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 },
  image_asset: null,
  is_trigger: false,
  enabled: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockUseIngredients.mockReturnValue({
    categories: [{ id: 'cat-1', name: 'Bread', slug: 'bread' }],
    pools: {}, loading: false, error: null,
  })
  mockFetchAdminIngredients.mockResolvedValue([ingredient1])
})

describe('IngredientsPage', () => {
  it('renders ingredient rows with name and category', async () => {
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
    expect(screen.getByText('Bread')).toBeInTheDocument()
  })

  it('saves a name edit on blur', async () => {
    mockUpdateIngredient.mockResolvedValue({ ...ingredient1, name: 'Sourdough Round' })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    const nameInput = screen.getByDisplayValue('Sourdough')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Sourdough Round')
    await userEvent.tab()

    await waitFor(() => { expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', { name: 'Sourdough Round' }) })
  })

  it('toggles enabled immediately on change', async () => {
    mockUpdateIngredient.mockResolvedValue({ ...ingredient1, enabled: false })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('checkbox', { name: /enabled/i }))

    await waitFor(() => { expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', { enabled: false }) })
  })

  it('changes the compat group', async () => {
    mockUpdateIngredient.mockResolvedValue({ ...ingredient1, compat_group: 'italian' })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.selectOptions(screen.getByLabelText(/compat group/i), 'italian')

    await waitFor(() => { expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', { compat_group: 'italian' }) })
  })

  it('toggles a dietary tag', async () => {
    mockUpdateIngredient.mockResolvedValue({ ...ingredient1, dietary_tags: ['vegetarian', 'vegan', 'gluten_free'] })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('checkbox', { name: /Gluten-Free/i }))

    await waitFor(() => {
      expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', { dietary_tags: ['vegetarian', 'vegan', 'gluten_free'] })
    })
  })

  it('opens the Add Ingredient modal and creates a new ingredient', async () => {
    mockCreateIngredient.mockResolvedValue({ ...ingredient1, id: 'ing-2', name: 'Havarti', slug: 'havarti' })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('button', { name: /add ingredient/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^name$/i), 'Havarti')
    await userEvent.type(screen.getByLabelText(/^slug$/i), 'havarti')
    await userEvent.selectOptions(screen.getByLabelText(/^category$/i), 'cat-1')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => { expect(screen.getByDisplayValue('Havarti')).toBeInTheDocument() })
    expect(mockCreateIngredient).toHaveBeenCalledWith('token-abc', expect.objectContaining({
      name: 'Havarti', slug: 'havarti', category_id: 'cat-1',
    }))
    expect(toast.success).toHaveBeenCalled()
  })

  it('offers every supported dietary tag by its label', async () => {
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    for (const label of ['Vegan', 'Vegetarian', 'Pescatarian', 'Dairy-Free', 'Gluten-Free', 'Contains Pork', 'Contains Shellfish', 'Contains Peanuts']) {
      expect(screen.getByRole('checkbox', { name: `${label}: Sourdough` })).toBeInTheDocument()
    }
  })

  it('adds a contains tag to an ingredient', async () => {
    mockUpdateIngredient.mockResolvedValue({ ...ingredient1, dietary_tags: ['vegetarian', 'vegan', 'contains_pork'] })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('checkbox', { name: 'Contains Pork: Sourdough' }))

    await waitFor(() => {
      expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', { dietary_tags: ['vegetarian', 'vegan', 'contains_pork'] })
    })
  })
})
