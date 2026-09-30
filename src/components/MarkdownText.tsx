import Markdown from 'react-markdown'

type Props = {
  children: string
}

export default function MarkdownText({ children }: Props) {
  if (children.trim() === '') return null

  return (
    <div className="space-y-3 text-neutral-700 [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">
      <Markdown>{children}</Markdown>
    </div>
  )
}
