import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

vi.mock('@/components/sandwich-page/RatingSubmission', () => ({ default: () => <div>Mock RatingSubmission</div> }))
vi.mock('@/components/sandwich-page/CommentSection', () => ({ default: () => <div>Mock CommentSection</div> }))
vi.mock('@/components/sandwich-page/PhotoGallery', () => ({ default: () => <div>Mock PhotoGallery</div> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import SandwichCardPage from '@/components/sandwich-page/SandwichCardPage'
import { accessibilityProblems } from '@/test/accessibility'

const mockWriteText = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockWriteText.mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText: mockWriteText } })
})

const baseProps = {
  targetType: 'database' as const,
  slug: 'reuben',
  targetId: 'target-1',
  name: 'Classic Reuben',
  avgRating: 4.3,
  ratingCount: 128,
  heroVisual: <div>Hero visual</div>,
  infoSection: <div>Info section</div>,
}

describe('SandwichCardPage', () => {
  it('renders the descriptive name as the heading when there is no fun name', () => {
    render(<SandwichCardPage {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Classic Reuben' })).toBeInTheDocument()
  })

  it('renders the fun name above the descriptive name when provided', () => {
    render(<SandwichCardPage {...baseProps} funName="The Midnight Club" />)
    expect(screen.getByRole('heading', { name: 'The Midnight Club' })).toBeInTheDocument()
    expect(screen.getByText('Classic Reuben')).toBeInTheDocument()
  })

  it('renders no fun name artifact when funName is undefined', () => {
    render(<SandwichCardPage {...baseProps} />)
    expect(screen.queryByTestId('fun-name')).not.toBeInTheDocument()
  })

  it('renders the hero visual and info section slots', () => {
    render(<SandwichCardPage {...baseProps} />)
    expect(screen.getByText('Hero visual')).toBeInTheDocument()
    expect(screen.getByText('Info section')).toBeInTheDocument()
  })

  it('renders the aggregate rating', () => {
    render(<SandwichCardPage {...baseProps} />)
    expect(screen.getByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('(128 ratings)')).toBeInTheDocument()
  })

  it('renders the rating submission, comment section, and photo gallery', () => {
    render(<SandwichCardPage {...baseProps} />)
    expect(screen.getByText('Mock RatingSubmission')).toBeInTheDocument()
    expect(screen.getByText('Mock CommentSection')).toBeInTheDocument()
    expect(screen.getByText('Mock PhotoGallery')).toBeInTheDocument()
  })

  it('renders an optional action bar slot', () => {
    render(<SandwichCardPage {...baseProps} actionBar={<button>Try This Sandwich</button>} />)
    expect(screen.getByRole('button', { name: 'Try This Sandwich' })).toBeInTheDocument()
  })

  it('copies the current page URL and shows a confirmation toast when Share is clicked', async () => {
    render(<SandwichCardPage {...baseProps} />)
    await userEvent.click(screen.getByRole('button', { name: /share/i }))

    expect(mockWriteText).toHaveBeenCalledWith(window.location.href)
    expect(toast.success).toHaveBeenCalled()
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    render(<SandwichCardPage {...baseProps} />)
    await screen.findByRole('heading', { name: 'Classic Reuben' })

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
