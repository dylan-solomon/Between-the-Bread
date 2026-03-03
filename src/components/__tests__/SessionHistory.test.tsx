import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionHistory from '@/components/SessionHistory'
import { makeComposition, makeIngredient } from '@/test/factories'
import type { HistoryEntry } from '@/types'

const makeEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: crypto.randomUUID(),
  composition: makeComposition(),
  name: 'The Test Sandwich',
  timestamp: new Date(),
  ...overrides,
})

describe('SessionHistory', () => {
  describe('when there are no entries', () => {
    it('renders nothing', () => {
      const { container } = render(<SessionHistory entries={[]} onLoad={vi.fn()} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('when there are entries', () => {
    it('shows a trigger button with the entry count', () => {
      render(<SessionHistory entries={[makeEntry(), makeEntry()]} onLoad={vi.fn()} />)
      expect(screen.getByRole('button', { name: /history \(2\)/i })).toBeInTheDocument()
    })

    it('does not show the entry list before the trigger is clicked', () => {
      render(<SessionHistory entries={[makeEntry({ name: 'Secret Sandwich' })]} onLoad={vi.fn()} />)
      expect(screen.queryByText('Secret Sandwich')).not.toBeInTheDocument()
    })

    it('trigger button starts with aria-expanded false', () => {
      render(<SessionHistory entries={[makeEntry()]} onLoad={vi.fn()} />)
      expect(screen.getByRole('button', { name: /history/i })).toHaveAttribute('aria-expanded', 'false')
    })

    it('clicking the trigger opens the panel and shows entry names', async () => {
      render(<SessionHistory entries={[makeEntry({ name: 'The Smoky Italian' })]} onLoad={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      expect(screen.getByText('The Smoky Italian')).toBeInTheDocument()
    })

    it('clicking the trigger sets aria-expanded to true', async () => {
      render(<SessionHistory entries={[makeEntry()]} onLoad={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      expect(screen.getByRole('button', { name: /history/i })).toHaveAttribute('aria-expanded', 'true')
    })

    it('clicking the trigger again closes the panel', async () => {
      render(<SessionHistory entries={[makeEntry({ name: 'The Smoky Italian' })]} onLoad={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      expect(screen.queryByText('The Smoky Italian')).not.toBeInTheDocument()
    })

    it('shows a Load button for each entry when panel is open', async () => {
      const entries = [makeEntry(), makeEntry(), makeEntry()]
      render(<SessionHistory entries={entries} onLoad={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      expect(screen.getAllByRole('button', { name: /load/i })).toHaveLength(3)
    })

    it('clicking Load calls onLoad with the correct entry', async () => {
      const onLoad = vi.fn()
      const entry = makeEntry({
        name: 'The Classic Club',
        composition: makeComposition({ bread: [makeIngredient({ name: 'Ciabatta', slug: 'ciabatta' })] }),
      })
      render(<SessionHistory entries={[entry]} onLoad={onLoad} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      await userEvent.click(screen.getByRole('button', { name: /load/i }))
      expect(onLoad).toHaveBeenCalledOnce()
      expect(onLoad).toHaveBeenCalledWith(entry)
    })

    it('clicking Load closes the panel', async () => {
      const entry = makeEntry({ name: 'The Classic Club' })
      render(<SessionHistory entries={[entry]} onLoad={vi.fn()} />)
      await userEvent.click(screen.getByRole('button', { name: /history/i }))
      await userEvent.click(screen.getByRole('button', { name: /load/i }))
      expect(screen.queryByText('The Classic Club')).not.toBeInTheDocument()
    })
  })
})
