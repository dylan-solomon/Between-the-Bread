import type { BlogPostPreview, SandwichEntry } from '../src/api/database'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../src/data/categoryLabels'
import { DIETARY_DISCLAIMER, getDietaryTag, isDietaryTag } from '../src/data/dietaryTags'
import { entryDescription } from '../src/seo/sandwichEntry'
import { formatPostDate } from '../src/utils/blogPost'
import { escapeHtml, metaTag, titleTag, twitterTags } from './html'
import { markdownHtml } from './markdown'
import { ratingHtml } from './rating'
import type { Page } from './page'

const SECTION_HEADING_CLASS = 'font-display text-lg font-bold text-neutral-900'

const hero = (entry: SandwichEntry): string =>
  entry.image_url === null
    ? '<div role="img" aria-label="No image available" class="text-center text-6xl">🥪</div>'
    : `<img src="${escapeHtml(entry.image_url)}" alt="${escapeHtml(entry.name)}" class="h-72 w-full rounded-lg object-cover" />`

const origin = (entry: SandwichEntry): string => {
  const text = [entry.origin_country, entry.origin_region]
    .filter((part) => part !== null)
    .join(' · ')
  return text === ''
    ? ''
    : `<p class="text-sm font-medium uppercase tracking-wide text-neutral-500">${escapeHtml(text)}</p>`
}

const otherNames = (entry: SandwichEntry): string =>
  entry.alternative_names.length === 0
    ? ''
    : `<p class="text-sm italic text-neutral-600">Also known as: ${escapeHtml(entry.alternative_names.join(', '))}</p>`

const ingredients = (entry: SandwichEntry): string => {
  const groups = CATEGORY_ORDER.flatMap((slug) => {
    const items = entry.canonical_ingredients[slug] ?? []
    return items.length > 0 ? [{ slug, items }] : []
  })
  if (groups.length === 0) return ''
  const rows = groups
    .map(
      ({ slug, items }) =>
        `<div><dt class="text-sm font-semibold text-neutral-700">${escapeHtml(CATEGORY_LABELS[slug])}</dt><dd class="text-sm text-neutral-600">${items
          .map((item) => `<span class="mr-2 inline-block">${escapeHtml(item.name)}</span>`)
          .join('')}</dd></div>`,
    )
    .join('')
  return `<div><h2 class="${SECTION_HEADING_CLASS}">Ingredients</h2><dl class="mt-2 space-y-2">${rows}</dl></div>`
}

const dietaryTags = (entry: SandwichEntry): string => {
  const tags = entry.dietary_tags.filter(isDietaryTag).map(getDietaryTag)
  if (tags.length === 0) return ''
  const items = tags
    .map(
      ({ label, kind }) =>
        `<li class="rounded-full px-3 py-1 text-xs ${kind === 'avoid' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}">${escapeHtml(label)}</li>`,
    )
    .join('')
  return `<div><ul class="flex flex-wrap gap-2">${items}</ul><p class="mt-2 text-xs text-neutral-400">${escapeHtml(DIETARY_DISCLAIMER)}</p></div>`
}

const blogPostLink = (post: BlogPostPreview): string =>
  [
    `<li><a href="/blog/${escapeHtml(post.slug)}" class="text-primary underline">${escapeHtml(post.title)}</a>`,
    `<p class="text-xs text-neutral-500">${formatPostDate(post.published_at)} · ${String(post.reading_time_minutes)} min read</p></li>`,
  ].join('')

const blogPosts = (entry: SandwichEntry): string =>
  entry.blog_posts.length === 0
    ? ''
    : `<section><h2 class="${SECTION_HEADING_CLASS}">From the blog</h2><ul class="mt-2 space-y-2">${entry.blog_posts.map(blogPostLink).join('')}</ul></section>`

const entryHtml = (entry: SandwichEntry): string =>
  [
    '<div class="mx-auto max-w-[720px] px-4 py-12">',
    `<div class="text-center"><h1 class="font-display text-3xl font-bold text-neutral-900">${escapeHtml(entry.name)}</h1></div>`,
    `<div class="mt-6">${hero(entry)}</div>`,
    `<div class="mt-4 flex justify-center">${ratingHtml(entry)}</div>`,
    '<div class="mt-8"><div class="space-y-6">',
    origin(entry),
    otherNames(entry),
    entry.description === null
      ? ''
      : `<p class="text-lg text-neutral-800">${escapeHtml(entry.description)}</p>`,
    entry.history === null ? '' : markdownHtml(entry.history),
    ingredients(entry),
    dietaryTags(entry),
    blogPosts(entry),
    '</div></div>',
    '</div>',
  ].join('')

export const sandwichEntryPage = ({
  entry,
  origin: siteOrigin,
}: {
  entry: SandwichEntry
  origin: string
}): Page => {
  const path = `/sandwiches/${entry.slug}`
  const pageUrl = `${siteOrigin}${path}`

  return {
    tags: [
      titleTag(`${entry.name} | Between the Bread`),
      metaTag('og:title', entry.name),
      ...(entry.description === null ? [] : [metaTag('og:description', entry.description)]),
      ...(entry.image_url === null ? [] : [metaTag('og:image', entry.image_url)]),
      metaTag('og:url', pageUrl),
      metaTag('og:type', 'article'),
      ...twitterTags({ title: entry.name, description: entry.description, image: entry.image_url }),
    ],
    search: { description: entryDescription(entry), canonical: pageUrl },
    content: { html: entryHtml(entry), path, data: entry },
  }
}
