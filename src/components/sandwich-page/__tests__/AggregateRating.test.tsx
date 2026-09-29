import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AggregateRating from '@/components/sandwich-page/AggregateRating'

describe('AggregateRating', () => {
  it('shows "No ratings yet" when there are no ratings', () => {
    render(<AggregateRating avgRating={null} ratingCount={0} />)
    expect(screen.getByText('No ratings yet')).toBeInTheDocument()
  })

  it('shows the average rating and count', () => {
    render(<AggregateRating avgRating={4.3} ratingCount={128} />)
    expect(screen.getByText('4.3')).toBeInTheDocument()
    expect(screen.getByText('(128 ratings)')).toBeInTheDocument()
  })

  it('uses singular "rating" for a count of 1', () => {
    render(<AggregateRating avgRating={5} ratingCount={1} />)
    expect(screen.getByText('(1 rating)')).toBeInTheDocument()
  })

  it('exposes an accessible label describing the aggregate rating', () => {
    render(<AggregateRating avgRating={4.3} ratingCount={128} />)
    expect(screen.getByRole('img', { name: 'Rated 4.3 out of 5 from 128 ratings' })).toBeInTheDocument()
  })

  it('renders no interactive controls', () => {
    render(<AggregateRating avgRating={4.3} ratingCount={128} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
