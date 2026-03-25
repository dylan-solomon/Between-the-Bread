import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StarRating from '@/components/StarRating'

const TOOLTIP_LABELS = [
  'Very Poor / Terrible',
  'Below Average / Poor',
  'Average / Satisfactory',
  'Good / Above Average',
  'Excellent / Masterpiece',
]

describe('StarRating', () => {
  it('renders 5 star buttons', () => {
    render(<StarRating value={null} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('shows all stars as empty when value is null', () => {
    render(<StarRating value={null} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label', expect.stringContaining('Rate'))
    })
  })

  it('fills stars up to the current value', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('data-filled', 'true')
    expect(buttons[1]).toHaveAttribute('data-filled', 'true')
    expect(buttons[2]).toHaveAttribute('data-filled', 'true')
    expect(buttons[3]).toHaveAttribute('data-filled', 'false')
    expect(buttons[4]).toHaveAttribute('data-filled', 'false')
  })

  it('calls onChange with the clicked star value', async () => {
    const onChange = vi.fn()
    render(<StarRating value={null} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button')[2])
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with value 1 when clicking the first star', async () => {
    const onChange = vi.fn()
    render(<StarRating value={null} onChange={onChange} />)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('has tooltip labels matching the design system', () => {
    render(<StarRating value={null} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    TOOLTIP_LABELS.forEach((label, i) => {
      expect(buttons[i]).toHaveAttribute('title', label)
    })
  })

  it('has accessible aria-labels for each star', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-label', 'Rate 1 star: Very Poor / Terrible')
    expect(buttons[4]).toHaveAttribute('aria-label', 'Rate 5 stars: Excellent / Masterpiece')
  })

  it('announces the current rating via the group aria-label', () => {
    const { rerender } = render(<StarRating value={4} onChange={vi.fn()} />)
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Rating: 4 out of 5')

    rerender(<StarRating value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Rating: unrated')
  })

  it('does not call onChange when disabled', async () => {
    const onChange = vi.fn()
    render(<StarRating value={2} onChange={onChange} disabled />)
    await userEvent.click(screen.getAllByRole('button')[3])
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables all buttons when disabled prop is true', () => {
    render(<StarRating value={2} onChange={vi.fn()} disabled />)
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
