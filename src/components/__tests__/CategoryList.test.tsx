import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CategoryList from '@/components/CategoryList'
import { makeComposition } from '@/test/factories'

const renderList = (composition: Parameters<typeof CategoryList>[0]['composition'] = null) =>
  render(
    <CategoryList
      composition={composition}
      lockedCategories={new Set()}
      doubleCategories={new Set()}
      isRolling={false}
      rollingCategory={null}
      onToggleLock={vi.fn()}
      onToggleDouble={vi.fn()}
      onRoll={vi.fn()}
    />,
  )

describe('CategoryList', () => {
  describe('with no composition', () => {
    it('renders all 5 base category emojis', () => {
      renderList(null)
      expect(screen.getByText('🍞')).toBeInTheDocument()
      expect(screen.getByText('🥩')).toBeInTheDocument()
      expect(screen.getByText('🧀')).toBeInTheDocument()
      expect(screen.getByText('🥬')).toBeInTheDocument()
      expect(screen.getByText('🫙')).toBeInTheDocument()
    })

    it('shows a placeholder for every category', () => {
      renderList(null)
      expect(screen.getAllByText('—')).toHaveLength(5)
    })
  })

  describe('with a composition', () => {
    it('shows all category selections', () => {
      renderList(makeComposition())
      expect(screen.getByText('Sourdough')).toBeInTheDocument()
      expect(screen.getByText('Turkey')).toBeInTheDocument()
      expect(screen.getByText('Swiss')).toBeInTheDocument()
      expect(screen.getByText('Lettuce')).toBeInTheDocument()
      expect(screen.getByText('Mayo')).toBeInTheDocument()
    })

    it('renders categories in display order (bread first, condiments last)', () => {
      renderList(makeComposition())
      const emojis = screen.getAllByText(/🍞|🥩|🧀|🥬|🫙/)
      expect(emojis[0]).toHaveTextContent('🍞')
      expect(emojis[4]).toHaveTextContent('🫙')
    })
  })
})
