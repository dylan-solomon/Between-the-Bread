import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { makeCategories, makeIngredient } from '@/test/factories'

const { mockFetchSandwich, mockUseIngredients, mockEntryViewed, mockTryThisClicked } = vi.hoisted(() => ({
  mockFetchSandwich: vi.fn(),
  mockUseIngredients: vi.fn(),
  mockEntryViewed: vi.fn(),
  mockTryThisClicked: vi.fn(),
}))

vi.mock('@/api/database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/database')>()),
  fetchSandwich: mockFetchSandwich,
}))
vi.mock('@/hooks/useIngredients', () => ({ useIngredients: mockUseIngredients }))
vi.mock('@/analytics/events', () => ({
  captureEncyclopediaEntryViewed: mockEntryViewed,
  captureEncyclopediaTryThisClicked: mockTryThisClicked,
}))
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
  default: (props: { composition: Record<string, { name: string }[]>; exact: boolean; onTry?: () => void }) => (
    <button type="button" onClick={props.onTry} data-exact={String(props.exact)} data-composition={JSON.stringify(props.composition)}>
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
import { accessibilityProblems } from '@/test/accessibility'

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
  alternative_names: ['Reuben sandwich', 'Reubens'],
  image_url: null,
  avg_rating: 4.5,
  rating_count: 12,
  comment_count: 3,
  photo_count: 2,
  blog_posts: [] as Record<string, unknown>[],
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
    lookupPools: {
      bread: [makeIngredient({ name: 'Rye', slug: 'rye' })],
      protein: [makeIngredient({ name: 'Corned Beef', slug: 'corned-beef' }), makeIngredient({ name: 'Roast pork', slug: 'roast-pork', enabled: false })],
    },
    loading: false,
    error: null,
  })
})

const blogPost = (slug: string, title: string) => ({
  slug,
  title,
  excerpt: 'About sandwiches.',
  cover_image_url: null,
  published_at: '2026-10-01T12:00:00.000Z',
  reading_time_minutes: 4,
})

const sendWithPage = (path: string, data: unknown): void => {
  const script = document.createElement('script')
  script.type = 'application/json'
  script.id = 'initial-data'
  script.textContent = JSON.stringify({ path, data })
  document.body.appendChild(script)
}

describe('SandwichDetail sent with the page', () => {
  afterEach(() => { document.getElementById('initial-data')?.remove() })

  it('shows the entry straight away without asking the server for it again', () => {
    sendWithPage('/sandwiches/reuben', reuben)

    renderAt()

    expect(screen.getByRole('heading', { name: 'Reuben' })).toBeInTheDocument()
    expect(mockFetchSandwich).not.toHaveBeenCalled()
    expect(mockEntryViewed).toHaveBeenCalledWith({ slug: 'reuben' })
  })

  it('loads the entry when the content sent was for another page', async () => {
    sendWithPage('/sandwiches/cubano', { ...reuben, slug: 'cubano', name: 'Cubano' })

    renderAt()

    expect(screen.getByRole('status', { name: 'Loading sandwich' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Reuben' })).toBeInTheDocument()
    expect(mockFetchSandwich).toHaveBeenCalledWith('reuben')
  })

  it('loads the entry when the content sent is incomplete', async () => {
    sendWithPage('/sandwiches/reuben', { slug: 'reuben' })

    renderAt()

    expect(await screen.findByRole('heading', { name: 'Reuben' })).toBeInTheDocument()
    expect(mockFetchSandwich).toHaveBeenCalledWith('reuben')
  })
})

describe('SandwichDetail search tags', () => {
  it('describes the page with the entry description and names its canonical address', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Corned beef and sauerkraut on rye.')
    })
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://betweenbread.co/sandwiches/reuben')
  })
})

describe('SandwichDetail blog posts', () => {
  it('lists the blog posts that mention the sandwich', async () => {
    mockFetchSandwich.mockResolvedValue({
      ...reuben,
      blog_posts: [blogPost('best-reubens', 'Best Reubens'), blogPost('rye-guide', 'A guide to rye')],
    })
    renderAt()

    const section = (await screen.findByRole('heading', { name: 'From the blog' })).closest('section')
    if (section === null) throw new Error('section not found')
    expect(within(section).getByRole('link', { name: 'Best Reubens' })).toHaveAttribute('href', '/blog/best-reubens')
    expect(within(section).getByRole('link', { name: 'A guide to rye' })).toHaveAttribute('href', '/blog/rye-guide')
    expect(within(section).getAllByText('Oct 1, 2026 · 4 min read')).toHaveLength(2)
  })

  it('leaves the section out when no post mentions the sandwich', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.queryByRole('heading', { name: 'From the blog' })).not.toBeInTheDocument()
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

  it('shows the other names the sandwich is known by', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('Also known as: Reuben sandwich, Reubens')).toBeInTheDocument()
  })

  it('shows the other names before the description', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    const alsoKnownAs = screen.getByText(/Also known as/)
    const description = screen.getByText('Corned beef and sauerkraut on rye.')
    expect(alsoKnownAs.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('leaves out the other names line when there are none', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, alternative_names: [] })
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.queryByText(/Also known as/)).not.toBeInTheDocument()
  })

  it('names the ingredient categories before the category list has loaded', async () => {
    mockUseIngredients.mockReturnValue({ categories: [], pools: {}, lookupPools: {}, loading: true, error: null })
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('Bread')).toBeInTheDocument()
    expect(screen.getByText('Protein')).toBeInTheDocument()
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

    expect(screen.getByText('Gluten-Free')).toBeInTheDocument()
  })

  it('shows contains tags by their full label', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, dietary_tags: ['contains_pork', 'contains_shellfish'] })
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText('Contains Pork')).toBeInTheDocument()
    expect(screen.getByText('Contains Shellfish')).toBeInTheDocument()
  })

  it('reminds readers that tags do not cover brand variation or cross-contamination', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.getByText(/cross-contamination/i)).toBeInTheDocument()
  })

  it('does not show the reminder when the entry has no dietary tags', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, dietary_tags: [] })
    renderAt()
    await screen.findByTestId('card-page')

    expect(screen.queryByText(/cross-contamination/i)).not.toBeInTheDocument()
  })

  it('shows the entry image when there is one', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, image_url: 'https://example.com/reuben.jpg' })
    renderAt()

    const image = await screen.findByRole('img', { name: 'Reuben' })
    expect(image).toHaveAttribute('src', 'https://example.com/reuben.jpg')
    expect(image).not.toHaveAttribute('loading', 'lazy')
  })

  it('draws a sandwich from matching ingredients when there is no image', async () => {
    renderAt()

    const visual = await screen.findByTestId('visual')
    expect(visual).toHaveTextContent('Rye')
    expect(visual).toHaveTextContent('Corned Beef')
  })

  it('draws ingredients that are not enabled in the randomizer too', async () => {
    mockFetchSandwich.mockResolvedValue({ ...reuben, canonical_ingredients: { bread: [{ name: 'Rye' }], protein: [{ name: 'Roast pork' }] } })
    renderAt()

    expect(await screen.findByTestId('visual')).toHaveTextContent('Roast pork')
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

  it('records an entry view once the entry has loaded', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(mockEntryViewed).toHaveBeenCalledTimes(1)
    expect(mockEntryViewed).toHaveBeenCalledWith({ slug: 'reuben' })
  })

  it('does not record an entry view for a missing entry', async () => {
    mockFetchSandwich.mockResolvedValue(null)
    renderAt('nope')
    await screen.findByRole('heading', { name: 'Sandwich not found' })

    expect(mockEntryViewed).not.toHaveBeenCalled()
  })

  it('records when Try This Sandwich is clicked', async () => {
    const user = userEvent.setup()
    renderAt()

    await user.click(await screen.findByRole('button', { name: 'Try This Sandwich' }))

    expect(mockTryThisClicked).toHaveBeenCalledWith({ slug: 'reuben' })
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
