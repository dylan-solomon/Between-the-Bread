import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { mockNavigate, mockUseIngredients } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseIngredients: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))

import TryThisSandwich from '@/components/sandwich-page/TryThisSandwich'
import { LOAD_SANDWICH_KEY } from '@/hooks/useSessionHistory'

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

type StoredComposition = { composition: Record<string, { slug: string; name: string }[]> }

const readStoredComposition = (): StoredComposition =>
  JSON.parse(sessionStorage.getItem(LOAD_SANDWICH_KEY) ?? '{}') as StoredComposition

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  mockUseIngredients.mockReturnValue({ pools: {}, categories: [], loading: false, error: null })
})

describe('TryThisSandwich', () => {
  it('renders a button labeled "Try This Sandwich"', () => {
    renderWithRouter(<TryThisSandwich composition={{}} exact />)
    expect(screen.getByRole('button', { name: 'Try This Sandwich' })).toBeInTheDocument()
  })

  it('loads exact slugs directly and navigates home when exact is true', async () => {
    const composition = {
      bread: [{ name: 'Rye', slug: 'rye' }],
      protein: [{ name: 'Corned Beef', slug: 'corned-beef' }],
    }
    renderWithRouter(<TryThisSandwich composition={composition} exact />)

    await userEvent.click(screen.getByRole('button', { name: 'Try This Sandwich' }))

    const stored = readStoredComposition()
    expect(stored.composition.bread).toEqual([{ slug: 'rye', name: 'Rye' }])
    expect(stored.composition.protein).toEqual([{ slug: 'corned-beef', name: 'Corned Beef' }])
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('fuzzy-matches canonical names against the ingredient pool when exact is false', async () => {
    mockUseIngredients.mockReturnValue({
      pools: {
        bread: [{ slug: 'rye', name: 'Rye', dietary_tags: [], compat_group: 'deli_classic', nutrition: {}, image_asset: '', is_trigger: false, enabled: true, estimated_cost: {} }],
        protein: [{ slug: 'corned-beef', name: 'Corned Beef', dietary_tags: [], compat_group: 'deli_classic', nutrition: {}, image_asset: '', is_trigger: false, enabled: true, estimated_cost: {} }],
      },
      categories: [],
      loading: false,
      error: null,
    })

    const composition = {
      bread: [{ name: 'rye' }],
      protein: [{ name: 'Pastrami' }],
    }
    renderWithRouter(<TryThisSandwich composition={composition} exact={false} />)

    await userEvent.click(screen.getByRole('button', { name: 'Try This Sandwich' }))

    const stored = readStoredComposition()
    expect(stored.composition.bread).toEqual([{ slug: 'rye', name: 'Rye' }])
    expect(stored.composition.protein).toBeUndefined()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
