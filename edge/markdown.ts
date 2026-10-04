import { micromark } from 'micromark'
import { MARKDOWN_CLASSES } from '../src/styles/markdownClasses'

export const markdownHtml = (markdown: string): string =>
  markdown.trim() === ''
    ? ''
    : `<div class="${MARKDOWN_CLASSES}">${micromark(markdown).replaceAll('<img ', '<img loading="lazy" decoding="async" ')}</div>`
