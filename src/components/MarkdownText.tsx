import Markdown from 'react-markdown'
import type { ComponentProps } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import { MARKDOWN_CLASSES } from '@/styles/markdownClasses'

const isSiteAddress = (href: string | undefined): href is string =>
  href !== undefined && href.startsWith('/') && !href.startsWith('//')

function MarkdownLink({ href, children }: ComponentProps<'a'>) {
  const inRouter = useInRouterContext()

  if (inRouter && isSiteAddress(href)) return <Link to={href}>{children}</Link>
  return <a href={href}>{children}</a>
}

type Props = {
  children: string
}

export default function MarkdownText({ children }: Props) {
  if (children.trim() === '') return null

  return (
    <div className={MARKDOWN_CLASSES}>
      <Markdown components={{ a: MarkdownLink }}>{children}</Markdown>
    </div>
  )
}
