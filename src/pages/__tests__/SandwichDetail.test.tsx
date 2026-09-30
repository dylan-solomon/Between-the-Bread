import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { makeCategories, makeIngredient } from '@/test/factories'

const { mockFetchSandwich, mockUseIngredients } = vi.hoisted(() => ({
  mockFetchSandwich: vi.fn(),
  mockUseIngredients: vi.fn(),
}))

vi.mock('@/api/database', () => ({ fetchSandwich: mockFetchSandwich }))
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))
vi.mock('@/components/sandwich-page/SandwichCardPage', () => ({
  default: (props: {
    targetType: string
    slug: string
    targetId: string
    name: string
    avgRating: number | null
    ratingCount: number
    heroVisual: ReactNode
    infoSection: ReactNode
    actionBar?: ReactNode
  }) => (
    <div data-testid="card-page" data-target-type={props.targetType} data-slug={props.slug} data-target-id={props.targetId}>
      <h1>{props.name}</h1>
      <span data-testid="rating">{`${String(props.avgRating)}/${String(props.ratingCount)}`}</span>
      {props.heroVisual}
      {props.infoSection}
      {props.actionBar}
    </div>
  ),
}))
vi.mock('@/components/sandwich-page/TryThisSandwich', () => ({
  default: (props: { composition: Record<string, { name: string }[]>; exact: boolean }) => (
    <button type="button" data-exact={String(props.exact)} data-composition={JSON.stringify(props.composition)}>
      Try This Sandwich
    </button>
  ),
}))
vi.mock('@/components/SandwichVisual', () => ({
  default: (props: { composition: Record<string, { name: string }[]> | null }) => (
    <div data-testid="visual">{Object.values(props.composition ?? {}).flat().map((i) => i.name).join(',')}</div>
  ),
}))

import SandwichDetail from '@/pages/SandwichDetail'

const reuben = {
  id: 's-1',
  name: 'Reuben',
  slug: 'reuben',
  description: 'Corned beef and sauerkraut on rye.',
  history: 'Origin **story** of the Reuben.',
  origin_country: 'United States',
  origin_region: 'Americas',
  canonical_ingredients: { bread: [{ name: 'Rye' }], protein: [{ name: 'Corned Beef' }] },
  dietary_tags: ['gluten_free'],
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
  comment_count: 3,
  photo_count: 2,
}

const renderAt = (slug = 'reuben') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/sandwiches/${slug}`]}>
        <Routes>
          <Route path="/sandwiches/:slug" element={<SandwichDetail />} />
          <Route path="/sandwiches" element={<div>Index page</div>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchSandwich.mockResolvedValue(reuben)
  mockUseIngredients.mockReturnValue({
    categories: makeCategories(),
    pools: {
      bread: [makeIngredient({ name: 'Rye', slug: 'rye' })],
      protein: [makeIngredient({ name: 'Corned Beef', slug: 'corned-beef' })],
    },
    loading: false,
    error: null,
  })
})

describe('SandwichDetail', () => {
  it('shows a loading state while fetching', () => {
    mockFetchSandwich.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('fetches the entry named in the url', async () => {
    renderAt('banh-mi')
    await screen.findByTestId('card-page')

    expect(mockFetchSandwich).toHaveBeenCalledWith('banh-mi')
  })

  it('renders the entry on the shared sandwich card page for database targets', async () => {
    renderAt()

    const card = await screen.findByTestId('card-page')
    expect(card).toHaveAttribute('data-target-type', 'database')
    expect(card).toHaveAttribute('data-slug', 'reuben')
    expect(card).toHaveAttribute('data-target-id', 's-1')
    expect(screen.getByRole('heading', { name: 'Reuben' })).toBeInTheDocument()
    expect(screen.getByTestId('rating')).toHaveTextContent('4.5/12')
  })

  it('shows the description, origin and formatted history', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('Corned beef and sauerkraut on rye.')).toBeInTheDocument()
    expect(screen.getByText(/United States/)).toBeInTheDocument()
    expect(screen.getByText(/Americas/)).toBeInTheDocument()
    expect(screen.getByText('story').tagName).toBe('STRONG')
  })

  it('lists the canonical ingredients under their category names', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('Rye')).toBeInTheDocument()
    expect(screen.getByText('Corned Beef')).toBeInTheDocument()
    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Protein')).toBeInTheDocument()
  })

  it('shows dietary tags', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('gluten free')).toBeInTheDocument()
  })

  it('shows the entry image when there is one', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, image_url: 'https://example.com/reuben.jpg' })
    renderAt()

    const image = await screen.findByRole('img', { name: 'Reuben' })
    expect(image).toHaveAttribute('src', 'https://example.com/reuben.jpg')
  })

  it('draws a sandwich from matching ingredients when there is no image', async () => {
    renderAt()

    const visual = await screen.findByTestId('visual')
    expect(visual).toHaveTextContent('Rye')
    expect(visual).toHaveTextContent('Corned Beef')
  })

  it('offers Try This Sandwich using the canonical ingredients', async () => {
    renderAt()

    const button = await screen.findByRole('button', { name: 'Try This Sandwich' })
    expect(button).toHaveAttribute('data-exact', 'false')
    expect(JSON.parse(button.getAttribute('data-composition') ?? '{}')).toEqual({
      bread: [{ name: 'Rye' }],
      protein: [{ name: 'Corned Beef' }],
    })
  })

  it('ignores canonical ingredients in unknown categories for Try This Sandwich', async () => {
    mockFetchSandwich.mockResolvedValue({
      ...reuben,
      canonical_ingredients: { bread: [{ name: 'Rye' }], sides: [{ name: 'Pickle' }] },
    })
    renderAt()

    const button = await screen.findByRole('button', { name: 'Try This Sandwich' })
    expect(JSON.parse(button.getAttribute('data-composition') ?? '{}')).toEqual({ bread: [{ name: 'Rye' }] })
  })

  it('shows a not found message with a link back to the index', async () => {
    mockFetchSandwich.mockResolvedValue(null)
    renderAt('nope')

    expect(await screen.findByRole('heading', { name: 'Sandwich not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse all sandwiches' })).toHaveAttribute('href', '/sandwiches')
  })

  it('shows an error when loading fails', async () => {
    mockFetchSandwich.mockRejectedValue(new Error('boom'))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })
})
