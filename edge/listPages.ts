import type { BlogCategory, BlogListing } from '../src/api/blog'
import type { SandwichPage } from '../src/api/database'
import { DIETARY_DISCLAIMER, DIETARY_TAGS } from '../src/data/dietaryTags'
import { REGIONS } from '../src/data/regions'
import {
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  ENCYCLOPEDIA_DESCRIPTION,
  ENCYCLOPEDIA_TITLE,
  categoryDescription,
  categoryTitle,
} from '../src/seo/listPages'
import { blogPostCard, loadMoreButton, sandwichCard } from './cards'
import { escapeHtml, metaTag, titleTag, twitterTags } from './html'
import type { Page } from './page'

const HEADING_CLASS = 'font-display text-3xl font-bold text-neutral-900'
const INPUT_CLASS = 'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm'
const GRID_CLASS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

const option = (value: string, label: string): string =>
  `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`

const encyclopediaFilters = (): string =>
  [
    '<form role="search" class="mt-6 flex gap-2">',
    `<input type="search" aria-label="Search sandwiches" placeholder="Search by name, country or ingredient" class="${INPUT_CLASS} flex-1" />`,
    '<button type="submit" class="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white">Search</button>',
    '</form>',
    '<div class="mt-4 flex flex-wrap items-center gap-4">',
    `<label class="flex items-center gap-2 text-sm text-neutral-700">Region <select class="${INPUT_CLASS}">${option('', 'All regions')}${REGIONS.map((region) => option(region, region)).join('')}</select></label>`,
    `<label class="flex items-center gap-2 text-sm text-neutral-700">Sort by <select class="${INPUT_CLASS}">${option('name', 'A–Z')}${option('rating', 'Highest rated')}${option('newest', 'Newest')}</select></label>`,
    '<fieldset class="flex flex-wrap gap-3"><legend class="sr-only">Dietary</legend>',
    DIETARY_TAGS.map(
      ({ filterLabel }) =>
        `<label class="flex items-center gap-1 text-sm text-neutral-700"><input type="checkbox" />${escapeHtml(filterLabel)}</label>`,
    ).join(''),
    '</fieldset></div>',
    `<p class="mt-2 text-xs text-neutral-400">${escapeHtml(DIETARY_DISCLAIMER)}</p>`,
  ].join('')

const encyclopediaHtml = ({ items, totalCount }: SandwichPage): string =>
  [
    '<div class="mx-auto max-w-5xl px-4 py-10">',
    `<h1 class="${HEADING_CLASS}">Sandwich Encyclopedia</h1>`,
    `<p class="mt-2 text-neutral-600">${escapeHtml(ENCYCLOPEDIA_DESCRIPTION)}</p>`,
    encyclopediaFilters(),
    '<div class="mt-8">',
    items.length === 0
      ? ''
      : [
          `<p class="mb-4 text-sm text-neutral-500">${totalCount === 1 ? '1 sandwich' : `${String(totalCount)} sandwiches`}</p>`,
          `<ul class="${GRID_CLASS}">${items.map(sandwichCard).join('')}</ul>`,
          loadMoreButton(items.length, totalCount),
        ].join(''),
    '</div></div>',
  ].join('')

export const encyclopediaPage = ({
  page,
  origin,
}: {
  page: SandwichPage
  origin: string
}): Page => ({
  tags: [titleTag(ENCYCLOPEDIA_TITLE), metaTag('og:title', ENCYCLOPEDIA_TITLE)],
  search: { description: ENCYCLOPEDIA_DESCRIPTION, canonical: `${origin}/sandwiches` },
  content: { html: encyclopediaHtml(page), path: '/sandwiches', data: page },
})

const navLinkClass = (active: boolean): string =>
  `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
    active
      ? 'border-primary bg-primary text-white'
      : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
  }`

const categoryNav = (categories: BlogCategory[], activeSlug: string | undefined): string =>
  [
    '<nav aria-label="Blog categories" class="mt-6"><ul class="flex flex-wrap gap-2">',
    `<li><a href="/blog"${activeSlug === undefined ? ' aria-current="page"' : ''} class="${navLinkClass(activeSlug === undefined)}">All</a></li>`,
    categories
      .filter((category) => category.post_count > 0)
      .map(
        (category) =>
          `<li><a href="/blog/category/${escapeHtml(category.slug)}"${category.slug === activeSlug ? ' aria-current="page"' : ''} class="${navLinkClass(category.slug === activeSlug)}">${escapeHtml(category.name)}</a></li>`,
      )
      .join(''),
    '</ul></nav>',
  ].join('')

const postList = ({ posts }: BlogListing): string =>
  [
    '<div class="mt-8">',
    posts.items.length === 0
      ? '<p class="text-center text-neutral-600">No posts yet.</p>'
      : `<ul class="${GRID_CLASS}">${posts.items.map(blogPostCard).join('')}</ul>${loadMoreButton(posts.items.length, posts.totalCount)}`,
    '</div>',
  ].join('')

const blogHtml = (listing: BlogListing): string =>
  [
    '<div class="mx-auto max-w-5xl px-4 py-10">',
    `<h1 class="${HEADING_CLASS}">Blog</h1>`,
    '<p class="mt-2 text-neutral-600">Sandwich stories, guides and ideas.</p>',
    categoryNav(listing.categories, undefined),
    postList(listing),
    '</div>',
  ].join('')

export const blogIndexPage = ({
  listing,
  origin,
}: {
  listing: BlogListing
  origin: string
}): Page => ({
  tags: [
    titleTag(BLOG_TITLE),
    metaTag('og:title', BLOG_TITLE),
    metaTag('og:description', BLOG_DESCRIPTION),
    `<link rel="alternate" type="application/rss+xml" title="Between the Bread Blog" href="${origin}/blog/rss.xml" data-rh="true" />`,
  ],
  search: { description: BLOG_DESCRIPTION, canonical: `${origin}/blog` },
  content: { html: blogHtml(listing), path: '/blog', data: listing },
})

const categoryHtml = (category: BlogCategory, listing: BlogListing): string =>
  [
    '<div class="mx-auto max-w-5xl px-4 py-10">',
    `<h1 class="${HEADING_CLASS}">${escapeHtml(category.name)}</h1>`,
    category.description === null
      ? ''
      : `<p class="mt-2 text-neutral-600">${escapeHtml(category.description)}</p>`,
    categoryNav(listing.categories, category.slug),
    postList(listing),
    '</div>',
  ].join('')

export const blogCategoryPage = ({
  category,
  listing,
  origin,
}: {
  category: BlogCategory
  listing: BlogListing
  origin: string
}): Page => {
  const title = categoryTitle(category)
  const description = categoryDescription(category)
  const path = `/blog/category/${category.slug}`

  return {
    tags: [
      titleTag(title),
      metaTag('og:title', title),
      metaTag('og:description', description),
      metaTag('og:url', `${origin}${path}`),
      metaTag('og:type', 'website'),
      ...twitterTags({ title, description, image: null }),
    ],
    search: { description, canonical: `${origin}${path}` },
    content: { html: categoryHtml(category, listing), path, data: listing },
  }
}
