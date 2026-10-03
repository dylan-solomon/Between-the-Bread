import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { clearSentData, sendWithPage } from '@/test/initialData'

const { mockFetchSandwich } = vi.hoisted(() => ({ mockFetchSandwich: vi.fn() }))

vi.mock('@/api/community', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/community')>()),
  fetchCommunitySandwich: mockFetchSandwich,
}))
vi.mock('@/components/sandwich-page/SandwichCardPage', () => ({
  default: (props: {
    targetType: string
    slug: string
    targetId: string
    name: string
    funName?: string
    avgRating: number | null
    ratingCount: number
    heroVisual: ReactNode
    infoSection: ReactNode
    actionBar?: ReactNode
  }) => (
    <div data-testid="card-page" data-target-type={props.targetType} data-slug={props.slug} data-target-id={props.targetId}>
      <h1>{props.funName ?? props.name}</h1>
      {props.funName !== undefined && <p data-testid="descriptive-name">{props.name}</p>}
      <span data-testid="rating">{`${String(props.avgRating)}/${String(props.ratingCount)}`}</span>
      <div data-testid="hero">{props.heroVisual}</div>
      {props.infoSection}
      {props.actionBar}
    </div>
  ),
}))
vi.mock('@/components/sandwich-page/TryThisSandwich', () => ({
  default: (props: { composition: Record<string, { name: string; slug?: string }[]>; exact: boolean }) => (
    <button type="button" data-exact={String(props.exact)} data-composition={JSON.stringify(props.composition)}>
      Try This Sandwich
    </button>
  ),
}))

import CommunityDetail from '@/pages/CommunityDetail'

const makeSandwich = (overrides: Record<string, unknown> = {}) => ({
  id: 'c-1',
  slug: 'turkey-swiss-on-rye-abc12345',
  name: 'Turkey & Swiss on Rye',
  fun_name: null,
  composition: {
    protein: [{ slug: 'turkey', name: 'Turkey' }],
    bread: [{ slug: 'rye', name: 'Rye' }],
    cheese: [{ slug: 'swiss', name: 'Swiss' }],
    condiments: [{ slug: 'mustard', name: 'Mustard' }, { slug: 'mayo', name: 'Mayo' }],
  },
  dietary_tags: ['contains_pork'],
  generated_count: 47,
  avg_rating: 4.5,
  rating_count: 12,
  created_at: '2026-10-01T12:00:00Z',
  comment_count: 3,
  photo_count: 1,
  first_made_by: { username: 'deli_dan', is_admin: false },
  ...overrides,
})

const renderAt = (slug = 'turkey-swiss-on-rye-abc12345') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/community/${slug}`]}>
        <Routes>
          <Route path="/community/:slug" element={<CommunityDetail />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )

beforeEach(() => {
  vi.resetAllMocks()
  mockFetchSandwich.mockResolvedValue(makeSandwich())
})

describe('CommunityDetail', () => {
  it('shows a loading state while fetching', () => {
    mockFetchSandwich.mockReturnValue(new Promise(() => undefined))
    renderAt()

    expect(screen.getByRole('status', { name: 'Loading sandwich' })).toBeInTheDocument()
  })

  it('asks for the sandwich named in the address', async () => {
    renderAt('ham-abc12345')
    await screen.findByTestId('card-page')

    expect(mockFetchSandwich).toHaveBeenCalledWith('ham-abc12345')
  })

  it('uses the shared sandwich page for a community sandwich', async () => {
    renderAt()

    const page = await screen.findByTestId('card-page')
    expect(page).toHaveAttribute('data-target-type', 'community')
    expect(page).toHaveAttribute('data-target-id', 'c-1')
    expect(page).toHaveAttribute('data-slug', 'turkey-swiss-on-rye-abc12345')
    expect(screen.getByRole('heading', { name: 'Turkey & Swiss on Rye' })).toBeInTheDocument()
    expect(screen.getByTestId('rating')).toHaveTextContent('4.5/12')
  })

  it('leads with the fun name when the sandwich has one', async () => {
    mockFetchSandwich.mockResolvedValue(makeSandwich({ fun_name: 'The Rye Guy' }))
    renderAt()

    expect(await screen.findByRole('heading', { name: 'The Rye Guy' })).toBeInTheDocument()
    expect(screen.getByTestId('descriptive-name')).toHaveTextContent('Turkey & Swiss on Rye')
  })

  it('draws the sandwich from its ingredients', async () => {
    renderAt()

    const hero = await screen.findByTestId('hero')
    expect(within(hero).getAllByLabelText('Rye')).toHaveLength(2)
    expect(within(hero).getByLabelText('Turkey')).toBeInTheDocument()
  })

  it('says how many times it has been made and who made it first', async () => {
    renderAt()

    expect(await screen.findByText('Made 47 times')).toBeInTheDocument()
    const firstMade = screen.getByText(/First made by/)
    expect(firstMade).toHaveTextContent('First made by @deli_dan on Oct 1, 2026')
    expect(within(firstMade).getByRole('link', { name: '@deli_dan' })).toHaveAttribute('href', '/u/deli_dan')
  })

  it('tags an admin first maker', async () => {
    mockFetchSandwich.mockResolvedValue(makeSandwich({ first_made_by: { username: 'boss', is_admin: true } }))
    renderAt()

    expect(await screen.findByText(/First made by/)).toHaveTextContent('Admin')
  })

  it('gives only the date when the first maker has no username', async () => {
    mockFetchSandwich.mockResolvedValue(makeSandwich({ first_made_by: null, generated_count: 1 }))
    renderAt()

    expect(await screen.findByText('First made on Oct 1, 2026')).toBeInTheDocument()
    expect(screen.getByText('Made once')).toBeInTheDocument()
  })

  it('lists every ingredient under its category, in sandwich order', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    const list = screen.getByRole('heading', { name: 'Ingredients' }).nextElementSibling
    if (list === null) throw new Error('ingredient list missing')
    expect([...list.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Bread', 'Protein', 'Cheese', 'Condiments'])
    expect(within(list as HTMLElement).getByText('Mustard')).toBeInTheDocument()
    expect(within(list as HTMLElement).getByText('Mayo')).toBeInTheDocument()
  })

  it('shows dietary tags with the reminder about labels', async () => {
    renderAt()

    expect(await screen.findByText('Contains Pork')).toBeInTheDocument()
    expect(screen.getByText(/always check labels/)).toBeInTheDocument()
  })

  it('loads exactly this sandwich into the generator', async () => {
    renderAt()

    const button = await screen.findByRole('button', { name: 'Try This Sandwich' })
    expect(button).toHaveAttribute('data-exact', 'true')
    expect(JSON.parse(button.getAttribute('data-composition') ?? '{}')).toEqual({
      bread: [{ slug: 'rye', name: 'Rye' }],
      protein: [{ slug: 'turkey', name: 'Turkey' }],
      cheese: [{ slug: 'swiss', name: 'Swiss' }],
      condiments: [{ slug: 'mustard', name: 'Mustard' }, { slug: 'mayo', name: 'Mayo' }],
    })
  })

  it('titles, describes and links the page for search engines', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    await waitFor(() => {
      expect(document.title).toBe('Turkey & Swiss on Rye | Community | Between the Bread')
      expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        'Turkey & Swiss on Rye: Rye, Turkey, Swiss, Mustard and Mayo. Made 47 times by the Between the Bread community.',
      )
      expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        'https://betweenbread.co/community/turkey-swiss-on-rye-abc12345',
      )
    })
  })

  it('shows a not found message with a link back to the leaderboard', async () => {
    mockFetchSandwich.mockResolvedValue(null)
    renderAt('nope')

    expect(await screen.findByRole('heading', { name: 'Sandwich not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse the leaderboard' })).toHaveAttribute('href', '/community')
  })

  it('shows an error when loading fails', async () => {
    mockFetchSandwich.mockRejectedValue(new Error('offline'))
    renderAt()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong loading this sandwich.')
  })
})

describe('CommunityDetail sent with the page', () => {
  afterEach(clearSentData)

  it('shows the sandwich straight away without asking the server again', () => {
    sendWithPage('/community/turkey-swiss-on-rye-abc12345', makeSandwich())

    renderAt()

    expect(screen.getByRole('heading', { name: 'Turkey & Swiss on Rye' })).toBeInTheDocument()
    expect(mockFetchSandwich).not.toHaveBeenCalled()
  })

  it('loads the sandwich when the content sent was for another page', async () => {
    sendWithPage('/community/other-abc12345', makeSandwich({ slug: 'other-abc12345', name: 'Other' }))

    renderAt()

    expect(await screen.findByRole('heading', { name: 'Turkey & Swiss on Rye' })).toBeInTheDocument()
    expect(mockFetchSandwich).toHaveBeenCalledWith('turkey-swiss-on-rye-abc12345')
  })
})

describe('CommunityDetail search engines', () => {
  it('asks search engines to skip sandwiches nobody has rated yet', async () => {
    mockFetchSandwich.mockResolvedValue(makeSandwich({ avg_rating: null, rating_count: 0 }))
    renderAt()
    await screen.findByTestId('card-page')

    await waitFor(() => { expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex') })
  })

  it('lets search engines index rated sandwiches', async () => {
    renderAt()
    await screen.findByTestId('card-page')

    await waitFor(() => { expect(document.title).toContain('Turkey & Swiss on Rye') })
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull()
  })
})
