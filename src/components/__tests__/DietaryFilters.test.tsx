import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DietaryFilters from '@/components/DietaryFilters'
import type { DietaryTag } from '@/types'

const renderFilters = (activeTags: DietaryTag[] = [], onToggle = vi.fn()) =>
  render(<DietaryFilters activeTags={activeTags} onToggle={onToggle} />)

describe('DietaryFilters', () => {
  describe('rendering', () => {
    it('renders a Vegetarian button', () => {
      renderFilters()
      expect(screen.getByRole('button', { name: 'Vegetarian' })).toBeInTheDocument()
    })

    it('renders a Vegan button', () => {
      renderFilters()
      expect(screen.getByRole('button', { name: 'Vegan' })).toBeInTheDocument()
    })

    it('renders a Gluten-Free button', () => {
      renderFilters()
      expect(screen.getByRole('button', { name: 'Gluten-Free' })).toBeInTheDocument()
    })

    it('renders a Dairy-Free button', () => {
      renderFilters()
      expect(screen.getByRole('button', { name: 'Dairy-Free' })).toBeInTheDocument()
    })

    it('renders a Pescatarian button', () => {
      renderFilters()
      expect(screen.getByRole('button', { name: 'Pescatarian' })).toBeInTheDocument()
    })

    it.each(['No Pork', 'No Shellfish', 'No Peanuts'])('renders a %s exclusion button', (name) => {
      renderFilters()
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    })

    it('renders the eight filters in display order', () => {
      renderFilters()
      expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
        'Vegan',
        'Vegetarian',
        'Pescatarian',
        'Dairy-Free',
        'Gluten-Free',
        'No Pork',
        'No Shellfish',
        'No Peanuts',
      ])
    })

    it('reminds users that tags do not cover brand variation or cross-contamination', () => {
      renderFilters()
      expect(screen.getByText(/cross-contamination/i)).toBeInTheDocument()
    })
  })

  describe('aria-pressed state', () => {
    it('all buttons are aria-pressed=false when no tags are active', () => {
      renderFilters([])
      const buttons = screen.getAllByRole('button')
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed', 'false')
      })
    })

    it('active tag button has aria-pressed=true', () => {
      renderFilters(['vegan'])
      expect(screen.getByRole('button', { name: 'Vegan' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('inactive tags still have aria-pressed=false when one tag is active', () => {
      renderFilters(['vegan'])
      expect(screen.getByRole('button', { name: 'Vegetarian' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: 'Gluten-Free' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: 'Dairy-Free' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('multiple active tags each show aria-pressed=true', () => {
      renderFilters(['vegan', 'gluten_free'])
      expect(screen.getByRole('button', { name: 'Vegan' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'Gluten-Free' })).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('interaction', () => {
    it('calls onToggle with "vegetarian" when Vegetarian is clicked', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)
      await userEvent.click(screen.getByRole('button', { name: 'Vegetarian' }))
      expect(onToggle).toHaveBeenCalledWith('vegetarian')
    })

    it('calls onToggle with "vegan" when Vegan is clicked', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)
      await userEvent.click(screen.getByRole('button', { name: 'Vegan' }))
      expect(onToggle).toHaveBeenCalledWith('vegan')
    })

    it('calls onToggle with "gluten_free" when Gluten-Free is clicked', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)
      await userEvent.click(screen.getByRole('button', { name: 'Gluten-Free' }))
      expect(onToggle).toHaveBeenCalledWith('gluten_free')
    })

    it('calls onToggle with "dairy_free" when Dairy-Free is clicked', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)
      await userEvent.click(screen.getByRole('button', { name: 'Dairy-Free' }))
      expect(onToggle).toHaveBeenCalledWith('dairy_free')
    })

    it('calls onToggle exactly once per click', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)
      await userEvent.click(screen.getByRole('button', { name: 'Vegan' }))
      expect(onToggle).toHaveBeenCalledOnce()
    })
  })

  describe('avoid filters', () => {
    it('toggles the contains tag when an exclusion button is clicked', async () => {
      const onToggle = vi.fn()
      renderFilters([], onToggle)

      await userEvent.click(screen.getByRole('button', { name: 'No Pork' }))

      expect(onToggle).toHaveBeenCalledWith('contains_pork')
    })

    it('shows an exclusion as pressed when its contains tag is active', () => {
      renderFilters(['contains_shellfish'])

      expect(screen.getByRole('button', { name: 'No Shellfish' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'No Pork' })).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
