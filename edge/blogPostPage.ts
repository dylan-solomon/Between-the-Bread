import type { BlogPost, BlogPostSummary, RelatedSandwich } from '../src/api/blog'
import { blogPostingData, postDescription } from '../src/seo/blogPosting'
import { scriptJson } from '../src/seo/scriptJson'
import { formatPostDate } from '../src/utils/blogPost'
import { escapeHtml, metaTag, titleTag, twitterTags } from './html'
import { markdownHtml } from './markdown'
import type { Page } from './page'

const CATEGORY_CLASS =
  'rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200'
const SECTION_HEADING_CLASS = 'font-display text-xl font-bold text-neutral-900'
const CARD_CLASS =
  'flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md'

const categoryList = (post: BlogPost): string =>
  post.categories.length === 0
    ? ''
    : `<ul class="flex flex-wrap gap-2">${post.categories
        .map(
          (category) =>
            `<li><a href="/blog/category/${escapeHtml(category.slug)}" class="${CATEGORY_CLASS}">${escapeHtml(category.name)}</a></li>`,
        )
        .join('')}</ul>`

const byline = (post: BlogPost): string =>
  [
    '<div class="mt-3 flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-neutral-500">',
    `<span>By ${escapeHtml(post.author_name)}</span> · `,
    `<time datetime="${escapeHtml(post.published_at)}">${formatPostDate(post.published_at)}</time> · `,
    `<span>${String(post.reading_time_minutes)} min read</span>`,
    '</p></div>',
  ].join('')

const coverImage = (post: BlogPost): string =>
  post.cover_image_url === null
    ? ''
    : `<img src="${escapeHtml(post.cover_image_url)}" alt="" class="mt-6 w-full rounded-lg object-cover" />`

const sandwichCard = (sandwich: RelatedSandwich): string =>
  [
    `<li><a href="/sandwiches/${escapeHtml(sandwich.slug)}" class="${CARD_CLASS}">`,
    sandwich.image_url === null
      ? '<div aria-hidden="true" class="flex h-28 items-center justify-center bg-neutral-100 text-4xl">🥪</div>'
      : `<img src="${escapeHtml(sandwich.image_url)}" alt="" class="h-28 w-full object-cover" />`,
    `<div class="p-3"><h3 class="font-display text-base font-bold text-neutral-900">${escapeHtml(sandwich.name)}</h3>`,
    sandwich.description === null
      ? ''
      : `<p class="mt-1 line-clamp-2 text-sm text-neutral-600">${escapeHtml(sandwich.description)}</p>`,
    '</div></a></li>',
  ].join('')

const postCard = (other: BlogPostSummary): string =>
  [
    `<li class="relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">`,
    `<div class="flex flex-1 flex-col gap-2 p-4">`,
    `<h3 class="font-display text-lg font-bold text-neutral-900"><a href="/blog/${escapeHtml(other.slug)}">${escapeHtml(other.title)}</a></h3>`,
    `<p class="line-clamp-3 text-sm text-neutral-600">${escapeHtml(other.excerpt)}</p>`,
    '</div></li>',
  ].join('')

const section = (heading: string, items: string[]): string =>
  items.length === 0
    ? ''
    : `<section class="mt-12"><h2 class="${SECTION_HEADING_CLASS}">${heading}</h2><ul class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">${items.join('')}</ul></section>`

const articleHtml = (post: BlogPost): string =>
  [
    '<div class="mx-auto max-w-[720px] px-4 py-12"><article>',
    categoryList(post),
    `<h1 class="mt-4 font-display text-3xl font-bold text-neutral-900">${escapeHtml(post.title)}</h1>`,
    byline(post),
    coverImage(post),
    `<div class="mt-8">${markdownHtml(post.body)}</div>`,
    '</article>',
    section('Sandwiches in this post', post.related_sandwiches.map(sandwichCard)),
    section('More from the blog', post.more_posts.map(postCard)),
    '</div>',
  ].join('')

export const blogPostPage = ({ post, origin }: { post: BlogPost; origin: string }): Page => {
  const path = `/blog/${post.slug}`
  const pageUrl = `${origin}${path}`
  const description = postDescription(post)

  return {
    tags: [
      titleTag(`${post.title} | Between the Bread`),
      metaTag('og:title', post.title),
      metaTag('og:description', description),
      ...(post.cover_image_url === null ? [] : [metaTag('og:image', post.cover_image_url)]),
      metaTag('og:url', pageUrl),
      metaTag('og:type', 'article'),
      metaTag('article:published_time', post.published_at),
      ...twitterTags({ title: post.title, description, image: post.cover_image_url }),
    ],
    search: {
      description,
      canonical: pageUrl,
      structuredData: scriptJson(blogPostingData({ post, pageUrl })),
    },
    content: { html: articleHtml(post), path, data: post },
  }
}
