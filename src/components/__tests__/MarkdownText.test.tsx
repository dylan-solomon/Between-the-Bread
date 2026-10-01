import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  })

  it('does not load a picture from a javascript address', () => {
    const { container } = render(<MarkdownText>{'![x](javascript:alert(1))'}</MarkdownText>)

    expect(container.querySelector('img')?.getAttribute('src') ?? '').not.toMatch(/^javascript:/i)
  })

  it('renders nothing for empty content', () => {
    const { container } = render(<MarkdownText>{''}</MarkdownText>)

    expect(container).toBeEmptyDOMElement()
  })
})
