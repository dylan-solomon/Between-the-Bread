import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'

const categories = [
  { slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, post_count: 3 },
  { slug: 'best-pairings', name: 'Best Pairings', description: null, post_count: 0 },
  { slug: 'dietary', name: 'Dietary', description: null, post_count: 1 },
]

const renderNav = (activeSlug?: string) =>
  render(
    <MemoryRouter>
      <BlogCategoryNav categories={categories} activeSlug={activeSlug} />
    </MemoryRouter>,
  )

describe('BlogCategoryNav', () => {
  it('offers All plus each category that has posts, in order', () => {
    renderNav()

    const links = within(screen.getByRole('navigation', { name: 'Blog categories' })).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['All', 'Sandwich Ideas', 'Dietary'])
  })

  it('links All to the blog and each category to its page', () => {
    renderNav()

    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('href', '/blog')
    expect(screen.getByRole('link', { name: 'Dietary' })).toHaveAttribute('href', '/blog/category/dietary')
  })

  it('marks All as current when no category is chosen', () => {
    renderNav()

    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dietary' })).not.toHaveAttribute('aria-current')
  })

  it('marks the chosen category as current', () => {
    renderNav('dietary')

    expect(screen.getByRole('link', { name: 'Dietary' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current')
  })
})
