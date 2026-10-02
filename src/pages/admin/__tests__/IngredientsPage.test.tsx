import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

const { mockUseAuth, mockUseIngredients, mockFetchAdminIngredients, mockUpdateIngredient, mockCreateIngredient, mockFetchAdminSandwiches, mockMoveIngredientCategory } = vi.hoisted(() => ({
  mockFetchAdminSandwiches: vi.fn(),
  mockMoveIngredientCategory: vi.fn(),
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
  fetchAdminSandwiches: mockFetchAdminSandwiches,
  moveIngredientCategory: mockMoveIngredientCategory,
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
  mockFetchAdminSandwiches.mockResolvedValue([])
})

describe('IngredientsPage', () => {
  it('renders ingredient rows with name and category', async () => {
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
    expect(screen.getByRole('combobox', { name: 'Category: Sourdough' })).toHaveValue('cat-1')
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

    await userEvent.selectOptions(screen.getByLabelText(/^compat group:/i), 'italian')

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

  it('creates new ingredients disabled and says why', async () => {
    mockCreateIngredient.mockResolvedValue({ ...ingredient1, id: 'ing-2', name: 'Havarti', slug: 'havarti', enabled: false })
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: /add ingredient/i }))

    expect(screen.queryByRole('checkbox', { name: 'Enabled' })).not.toBeInTheDocument()
    expect(screen.getByText(/start disabled/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/^name$/i), 'Havarti')
    await userEvent.type(screen.getByLabelText(/^slug$/i), 'havarti')
    await userEvent.selectOptions(screen.getByLabelText(/^category$/i), 'cat-1')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(mockCreateIngredient).toHaveBeenCalledWith('token-abc', expect.objectContaining({ enabled: false }))
    })
  })

  it('explains that nutrition and cost are needed when an ingredient cannot be enabled', async () => {
    mockUpdateIngredient.mockRejectedValue(Object.assign(new Error('bad request'), { code: 'INCOMPLETE_INGREDIENT' }))
    render(<IngredientsPage />)
    await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

    await userEvent.click(screen.getByRole('checkbox', { name: /enabled: sourdough/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Add nutrition and cost data before enabling this ingredient.')
    })
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

  describe('nutrition and cost', () => {
    const butter = { ...ingredient1, id: 'ing-2', name: 'Butter', slug: 'butter', enabled: false, nutrition: null, estimated_cost: null }

    const openDetails = async (name = 'Sourdough') => {
      await userEvent.click(screen.getByRole('button', { name: `Edit nutrition and cost: ${name}` }))
      return screen.getByRole('dialog', { name: `Nutrition and cost: ${name}` })
    }

    const fill = async (label: string, value: string) => {
      const input = screen.getByLabelText(label)
      await userEvent.clear(input)
      await userEvent.type(input, value)
    }

    const fillEverything = async () => {
      await fill('Calories', '100')
      await fill('Protein (g)', '0')
      await fill('Fat (g)', '11')
      await fill('Carbs (g)', '0')
      await fill('Fiber (g)', '0')
      await fill('Sodium (mg)', '80')
      await fill('Sugar (g)', '0')
      await fill('Retail low ($)', '0.05')
      await fill('Retail high ($)', '0.2')
      await fill('Restaurant low ($)', '0.15')
      await fill('Restaurant high ($)', '0.6')
    }

    const rowOf = (name: string) => screen.getByDisplayValue(name).closest('tr') as HTMLElement

    it('shows the current values in the dialog', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

      await openDetails()

      expect(screen.getByLabelText('Calories')).toHaveValue(120)
      expect(screen.getByLabelText('Protein (g)')).toHaveValue(4)
      expect(screen.getByLabelText('Fat (g)')).toHaveValue(0.5)
      expect(screen.getByLabelText('Sodium (mg)')).toHaveValue(210)
      expect(screen.getByLabelText('Retail low ($)')).toHaveValue(0.3)
      expect(screen.getByLabelText('Restaurant high ($)')).toHaveValue(3.6)
    })

    it('explains what one serving is', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

      await openDetails()

      expect(screen.getByText(/values are per serving/i)).toBeInTheDocument()
    })

    it('saves edited values as numbers and closes the dialog', async () => {
      mockUpdateIngredient.mockResolvedValue({ ...ingredient1, nutrition: { ...ingredient1.nutrition, calories: 130 } })
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
      await openDetails()

      await fill('Calories', '130')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-1', {
          nutrition: { calories: 130, protein_g: 4, fat_g: 0.5, carbs_g: 24, fiber_g: 1, sodium_mg: 210, sugar_g: 1 },
          estimated_cost: { retail_low: 0.3, retail_high: 1.2, restaurant_low: 0.9, restaurant_high: 3.6 },
        })
      })
      await waitFor(() => { expect(screen.queryByRole('dialog')).not.toBeInTheDocument() })
      expect(toast.success).toHaveBeenCalledWith('Nutrition and cost saved.')
    })

    it('starts blank for an ingredient with no data and accepts zeros', async () => {
      mockFetchAdminIngredients.mockResolvedValue([ingredient1, butter])
      mockUpdateIngredient.mockResolvedValue({
        ...butter,
        nutrition: { calories: 100, protein_g: 0, fat_g: 11, carbs_g: 0, fiber_g: 0, sodium_mg: 80, sugar_g: 0 },
        estimated_cost: { retail_low: 0.05, retail_high: 0.2, restaurant_low: 0.15, restaurant_high: 0.6 },
      })
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Butter')).toBeInTheDocument() })
      await openDetails('Butter')

      expect(screen.getByLabelText('Calories')).toHaveValue(null)
      await fillEverything()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(mockUpdateIngredient).toHaveBeenCalledWith('token-abc', 'ing-2', {
          nutrition: { calories: 100, protein_g: 0, fat_g: 11, carbs_g: 0, fiber_g: 0, sodium_mg: 80, sugar_g: 0 },
          estimated_cost: { retail_low: 0.05, retail_high: 0.2, restaurant_low: 0.15, restaurant_high: 0.6 },
        })
      })
    })

    it('refuses to save while a field is blank', async () => {
      mockFetchAdminIngredients.mockResolvedValue([ingredient1, butter])
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Butter')).toBeInTheDocument() })
      await openDetails('Butter')

      await fill('Calories', '100')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(toast.error).toHaveBeenCalledWith('Enter a number of zero or more for every nutrition and cost field.')
      expect(mockUpdateIngredient).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('refuses to save a negative value', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
      await openDetails()

      fireEvent.change(screen.getByLabelText('Sodium (mg)'), { target: { value: '-5' } })
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(toast.error).toHaveBeenCalledWith('Enter a number of zero or more for every nutrition and cost field.')
      expect(mockUpdateIngredient).not.toHaveBeenCalled()
    })

    it('refuses a low cost that is above its high cost', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
      await openDetails()

      await fill('Retail low ($)', '5')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(toast.error).toHaveBeenCalledWith('Each low cost must be no higher than its high cost.')
      expect(mockUpdateIngredient).not.toHaveBeenCalled()
    })

    it('keeps the dialog open and says so when the save fails', async () => {
      mockUpdateIngredient.mockRejectedValue(new Error('boom'))
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
      await openDetails()

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to save nutrition and cost.') })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes without saving when cancelled', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
      await openDetails()

      await fill('Calories', '999')
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(mockUpdateIngredient).not.toHaveBeenCalled()
    })

    it('flags ingredients with missing data and stops them being enabled', async () => {
      mockFetchAdminIngredients.mockResolvedValue([ingredient1, butter])
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Butter')).toBeInTheDocument() })

      expect(within(rowOf('Butter')).getByText('Missing data')).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Enabled: Butter' })).toBeDisabled()
    })

    it('does not flag or restrict ingredients that have their data', async () => {
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })

      expect(within(rowOf('Sourdough')).queryByText('Missing data')).not.toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: 'Enabled: Sourdough' })).toBeEnabled()
    })

    it('still lets an enabled ingredient with missing data be disabled', async () => {
      mockFetchAdminIngredients.mockResolvedValue([{ ...butter, enabled: true }])
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Butter')).toBeInTheDocument() })

      expect(screen.getByRole('checkbox', { name: 'Enabled: Butter' })).toBeEnabled()
    })

    it('lets the ingredient be enabled once its data has been added', async () => {
      mockFetchAdminIngredients.mockResolvedValue([ingredient1, butter])
      mockUpdateIngredient.mockResolvedValue({
        ...butter,
        nutrition: { calories: 100, protein_g: 0, fat_g: 11, carbs_g: 0, fiber_g: 0, sodium_mg: 80, sugar_g: 0 },
        estimated_cost: { retail_low: 0.05, retail_high: 0.2, restaurant_low: 0.15, restaurant_high: 0.6 },
      })
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Butter')).toBeInTheDocument() })
      await openDetails('Butter')
      await fillEverything()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => { expect(screen.getByRole('checkbox', { name: 'Enabled: Butter' })).toBeEnabled() })
      expect(within(rowOf('Butter')).queryByText('Missing data')).not.toBeInTheDocument()
    })
  })

  describe('sorting and filtering', () => {
    const cheddar = { ...ingredient1, id: 'ing-3', category_id: 'cat-2', name: 'Cheddar', slug: 'cheddar', compat_group: 'american' }
    const ham = { ...ingredient1, id: 'ing-4', category_id: 'cat-3', name: 'Ham', slug: 'ham', compat_group: 'deli_classic' }
    const butter = { ...ingredient1, id: 'ing-2', category_id: 'cat-4', name: 'Butter', slug: 'butter', compat_group: 'neutral', enabled: false, nutrition: null, estimated_cost: null }

    const names = (): string[] => screen.getAllByLabelText(/^Name: /).map((input) => (input as HTMLInputElement).value)

    const renderList = async () => {
      mockUseIngredients.mockReturnValue({
        categories: [
          { id: 'cat-1', name: 'Bread', slug: 'bread' },
          { id: 'cat-2', name: 'Cheese', slug: 'cheese' },
          { id: 'cat-3', name: 'Protein', slug: 'protein' },
          { id: 'cat-4', name: 'Condiments', slug: 'condiments' },
        ],
        pools: {}, loading: false, error: null,
      })
      mockFetchAdminIngredients.mockResolvedValue([ham, ingredient1, butter, cheddar])
      render(<IngredientsPage />)
      await waitFor(() => { expect(screen.getByDisplayValue('Sourdough')).toBeInTheDocument() })
    }

    it('lists ingredients by name to start with', async () => {
      await renderList()

      expect(names()).toEqual(['Butter', 'Cheddar', 'Ham', 'Sourdough'])
      expect(screen.getByText('Showing 4 of 4 ingredients')).toBeInTheDocument()
    })

    it('searches by name without regard to case', async () => {
      await renderList()

      await userEvent.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'CH')

      expect(names()).toEqual(['Cheddar'])
      expect(screen.getByText('Showing 1 of 4 ingredients')).toBeInTheDocument()
    })

    it('filters by category', async () => {
      await renderList()

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by category' }), 'Protein')

      expect(names()).toEqual(['Ham'])
    })

    it('filters by whether the ingredient is enabled', async () => {
      await renderList()
      const status = screen.getByRole('combobox', { name: 'Filter by status' })

      await userEvent.selectOptions(status, 'Disabled')
      expect(names()).toEqual(['Butter'])

      await userEvent.selectOptions(status, 'Enabled')
      expect(names()).toEqual(['Cheddar', 'Ham', 'Sourdough'])
    })

    it('filters to ingredients with missing nutrition or cost data', async () => {
      await renderList()

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by data' }), 'Missing data')

      expect(names()).toEqual(['Butter'])
    })

    it('combines the search and the filters', async () => {
      await renderList()

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Enabled')
      await userEvent.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'o')

      expect(names()).toEqual(['Sourdough'])
    })

    it('says so when nothing matches and offers to clear the filters', async () => {
      await renderList()

      await userEvent.type(screen.getByRole('searchbox', { name: 'Search ingredients' }), 'zzz')
      expect(screen.getByText('No ingredients match these filters.')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

      expect(names()).toHaveLength(4)
      expect(screen.getByRole('searchbox', { name: 'Search ingredients' })).toHaveValue('')
    })

    it('only offers to clear filters when some are set', async () => {
      await renderList()

      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    })

    it('sorts by category and reverses on a second click', async () => {
      await renderList()

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Category' }))
      expect(names()).toEqual(['Sourdough', 'Cheddar', 'Butter', 'Ham'])

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Category' }))
      expect(names()).toEqual(['Ham', 'Butter', 'Cheddar', 'Sourdough'])
    })

    it('sorts by enabled, keeping name order within each group', async () => {
      await renderList()

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Enabled' }))
      expect(names()).toEqual(['Butter', 'Cheddar', 'Ham', 'Sourdough'])

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Enabled' }))
      expect(names()).toEqual(['Cheddar', 'Ham', 'Sourdough', 'Butter'])
    })

    it('sorts by compat group, keeping name order within each group', async () => {
      await renderList()

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Compat Group' }))

      expect(names()).toEqual(['Cheddar', 'Ham', 'Butter', 'Sourdough'])
    })

    it('shows which column the list is sorted by', async () => {
      await renderList()
      const header = (label: string) => screen.getByRole('columnheader', { name: new RegExp(label) })

      expect(header('Name')).toHaveAttribute('aria-sort', 'ascending')
      expect(header('Category')).toHaveAttribute('aria-sort', 'none')

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Category' }))
      expect(header('Category')).toHaveAttribute('aria-sort', 'ascending')
      expect(header('Name')).toHaveAttribute('aria-sort', 'none')

      await userEvent.click(screen.getByRole('button', { name: 'Sort by Category' }))
      expect(header('Category')).toHaveAttribute('aria-sort', 'descending')
    })

    it('applies the sort to filtered results', async () => {
      await renderList()

      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'Enabled')
      await userEvent.click(screen.getByRole('button', { name: 'Sort by Category' }))

      expect(names()).toEqual(['Sourdough', 'Cheddar', 'Ham'])
    })
  })
})

describe('IngredientsPage category changes', () => {
  const twoCategories = () => {
    mockUseIngredients.mockReturnValue({
      categories: [
        { id: 'cat-1', name: 'Bread', slug: 'bread' },
        { id: 'cat-2', name: 'Toppings', slug: 'toppings' },
      ],
      pools: {}, loading: false, error: null,
    })
  }

  const entry = (name: string, ingredients: Record<string, { name: string }[]>) => ({
    id: name, name, slug: name.toLowerCase(), canonical_ingredients: ingredients,
  })

  const renderAndWait = async () => {
    render(<IngredientsPage />)
    await screen.findByDisplayValue('Sourdough')
  }

  it('offers every category in the dropdown with the current one selected', async () => {
    twoCategories()
    await renderAndWait()

    const select = screen.getByRole('combobox', { name: 'Category: Sourdough' })
    expect(select).toHaveValue('cat-1')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Bread', 'Toppings'])
  })

  it('moves the ingredient after confirmation, shows its new category and says so', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockMoveIngredientCategory.mockResolvedValue({ ingredient: { ...ingredient1, category_id: 'cat-2' }, entriesUpdated: 0 })
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    expect(window.confirm).toHaveBeenCalledWith('Move "Sourdough" from Bread to Toppings?')
    await waitFor(() => { expect(mockMoveIngredientCategory).toHaveBeenCalledWith('token-abc', 'ing-1', 'cat-2') })
    await waitFor(() => { expect(screen.getByRole('combobox', { name: 'Category: Sourdough' })).toHaveValue('cat-2') })
    expect(toast.success).toHaveBeenCalledWith('Moved "Sourdough" to Toppings.')
    expect(mockUpdateIngredient).not.toHaveBeenCalled()
  })

  it('tells you which encyclopedia entries will be updated to match', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockFetchAdminSandwiches.mockResolvedValue([
      entry('Reuben', { bread: [{ name: 'Rye' }] }),
      entry('Grilled Cheese', { bread: [{ name: 'sourdough' }] }),
      entry('Patty Melt', { bread: [{ name: 'Sourdough' }], toppings: [{ name: 'Onion' }] }),
      entry('Odd One', { toppings: [{ name: 'Sourdough' }] }),
    ])
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    expect(window.confirm).toHaveBeenCalledWith(
      'Move "Sourdough" from Bread to Toppings?\n\n2 encyclopedia entries list it under Bread and will be updated to list it under Toppings: Grilled Cheese, Patty Melt.',
    )
  })

  it('uses the singular when one entry will be updated', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockFetchAdminSandwiches.mockResolvedValue([entry('Patty Melt', { bread: [{ name: 'Sourdough' }] })])
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    expect(window.confirm).toHaveBeenCalledWith(
      'Move "Sourdough" from Bread to Toppings?\n\n1 encyclopedia entry lists it under Bread and will be updated to list it under Toppings: Patty Melt.',
    )
  })

  it('still moves the ingredient when the entries could not be checked first', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockFetchAdminSandwiches.mockRejectedValue(new Error('nope'))
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    expect(window.confirm).toHaveBeenCalledWith(
      'Move "Sourdough" from Bread to Toppings?\n\nAny encyclopedia entries that list it under Bread will be updated to list it under Toppings.',
    )
  })

  it('reports how many encyclopedia entries were updated and refreshes its list of them', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetchAdminSandwiches.mockResolvedValue([entry('Patty Melt', { bread: [{ name: 'Sourdough' }] })])
    mockMoveIngredientCategory.mockResolvedValue({ ingredient: { ...ingredient1, category_id: 'cat-2' }, entriesUpdated: 1 })
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    await waitFor(() => { expect(toast.success).toHaveBeenCalledWith('Moved "Sourdough" to Toppings and updated 1 encyclopedia entry.') })
    expect(mockFetchAdminSandwiches).toHaveBeenCalledTimes(2)
  })

  it('uses the plural for several updated entries', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockMoveIngredientCategory.mockResolvedValue({ ingredient: { ...ingredient1, category_id: 'cat-2' }, entriesUpdated: 3 })
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    await waitFor(() => { expect(toast.success).toHaveBeenCalledWith('Moved "Sourdough" to Toppings and updated 3 encyclopedia entries.') })
  })

  it('leaves the ingredient where it is when the move is cancelled', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    expect(mockMoveIngredientCategory).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Category: Sourdough' })).toHaveValue('cat-1')
  })

  it('explains when the new category already has an ingredient with the same slug', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockMoveIngredientCategory.mockRejectedValue(Object.assign(new Error('conflict'), { code: 'SLUG_TAKEN' }))
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Toppings already has an ingredient with the slug "sourdough", so it cannot be moved there.')
    })
    expect(screen.getByRole('combobox', { name: 'Category: Sourdough' })).toHaveValue('cat-1')
  })

  it('shows a general error when the move fails for another reason', async () => {
    twoCategories()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockMoveIngredientCategory.mockRejectedValue(new Error('nope'))
    await renderAndWait()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Category: Sourdough' }), 'cat-2')

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to move ingredient. Nothing was changed.') })
  })
})
