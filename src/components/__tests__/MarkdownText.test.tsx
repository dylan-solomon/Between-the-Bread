import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MarkdownText from '@/components/MarkdownText'

describe('MarkdownText', () => {
  it('renders paragraphs and emphasis', () => {
    render(<MarkdownText>{'First paragraph with **bold** text.\n\nSecond paragraph.'}</MarkdownText>)

    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
  })

  it('renders lists', () => {
    render(<MarkdownText>{'- Rye\n- Swiss'}</MarkdownText>)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('does not render raw HTML from the content', () => {
    const { container } = render(<MarkdownText>{'Hello <script>alert(1)</script><img src=x onerror=alert(1)>'}</MarkdownText>)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('does not render javascript links as clickable', () => {
    render(<MarkdownText>{'[click](javascript:alert(1))'}</MarkdownText>)

    const link = screen.queryByRole('link', { name: 'click' })
    expect(link?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
  })

  it('renders headings, ordered lists, quotes and pictures written in markdown', () => {
    const { container } = render(
      <MarkdownText>{'## Build it\n\n1. Toast\n2. Stack\n\n> Keep it simple\n\n![Toasted rye](https://cdn.example.com/rye.png)'}</MarkdownText>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Build it' })).toBeInTheDocument()
    expect(container.querySelector('ol')?.children).toHaveLength(2)
    expect(container.querySelector('blockquote')).toHaveTextContent('Keep it simple')
    expect(screen.getByRole('img', { name: 'Toasted rye' })).toHaveAttribute('src', 'https://cdn.example.com/rye.png')
    expect(screen.getByRole('img', { name: 'Toasted rye' })).toHaveAttribute('loading', 'lazy')
  })

  it('does not load a picture from a javascript address', () => {
    const { container } = render(<MarkdownText>{'![x](javascript:alert(1))'}</MarkdownText>)

    expect(container.querySelector('img')?.getAttribute('src') ?? '').not.toMatch(/^javascript:/i)
  })

  it('renders nothing for empty content', () => {
    const { container } = render(<MarkdownText>{''}</MarkdownText>)

    expect(container).toBeEmptyDOMElement()
  })

  describe('links', () => {
    const renderInRouter = (markdown: string) =>
      render(
        <MemoryRouter initialEntries={['/blog/start']}>
          <Routes>
            <Route path="/blog/start" element={<MarkdownText>{markdown}</MarkdownText>} />
            <Route path="/blog/next" element={<p>Next post</p>} />
          </Routes>
        </MemoryRouter>,
      )

    it('moves around the site without reloading when a link points to another page on it', async () => {
      const user = userEvent.setup()
      renderInRouter('Read [the next post](/blog/next).')

      await user.click(screen.getByRole('link', { name: 'the next post' }))

      expect(screen.getByText('Next post')).toBeInTheDocument()
    })

    it('keeps the address of a link to another page on the site', () => {
      renderInRouter('[the next post](/blog/next)')

      expect(screen.getByRole('link', { name: 'the next post' })).toHaveAttribute('href', '/blog/next')
    })

    it('leaves links to other websites as ordinary links', () => {
      renderInRouter('[Wikipedia](https://en.wikipedia.org/wiki/Grilled_cheese)')

      expect(screen.getByRole('link', { name: 'Wikipedia' })).toHaveAttribute(
        'href',
        'https://en.wikipedia.org/wiki/Grilled_cheese',
      )
    })

    it('does not treat a protocol-relative address as part of the site', () => {
      renderInRouter('[elsewhere](//example.com/page)')

      expect(screen.getByRole('link', { name: 'elsewhere' })).toHaveAttribute('href', '//example.com/page')
    })

    it('still renders links when there is no router around it', () => {
      render(<MarkdownText>{'[the next post](/blog/next)'}</MarkdownText>)

      expect(screen.getByRole('link', { name: 'the next post' })).toHaveAttribute('href', '/blog/next')
    })
  })
})
