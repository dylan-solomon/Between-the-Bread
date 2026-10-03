import type { BlogPostSummary } from '../src/api/blog'
import type { SandwichSummary } from '../src/api/database'
import { formatPostDate } from '../src/utils/blogPost'
import { escapeHtml } from './html'

const CATEGORY_BADGE_CLASS =
  'relative z-10 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200'

export const blogPostCard = (post: BlogPostSummary): string =>
  [
    '<li class="relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md">',
    post.cover_image_url === null
      ? '<div aria-hidden="true" class="flex h-40 items-center justify-center bg-neutral-100 text-5xl">🥪</div>'
      : `<img src="${escapeHtml(post.cover_image_url)}" alt="" class="h-40 w-full object-cover" />`,
    '<div class="flex flex-1 flex-col gap-2 p-4">',
    `<h2 class="font-display text-lg font-bold text-neutral-900"><a href="/blog/${escapeHtml(post.slug)}" class="after:absolute after:inset-0">${escapeHtml(post.title)}</a></h2>`,
    `<p class="line-clamp-3 text-sm text-neutral-600">${escapeHtml(post.excerpt)}</p>`,
    `<p class="text-xs text-neutral-500"><span>${formatPostDate(post.published_at)}</span> · <span>${String(post.reading_time_minutes)} min read</span></p>`,
    post.categories.length === 0
      ? ''
      : `<ul class="mt-auto flex flex-wrap gap-2 pt-1">${post.categories
          .map(
            (category) =>
              `<li><a href="/blog/category/${escapeHtml(category.slug)}" class="${CATEGORY_BADGE_CLASS}">${escapeHtml(category.name)}</a></li>`,
          )
          .join('')}</ul>`,
    '</div></li>',
  ].join('')

const ratingLine = ({ avg_rating, rating_count }: SandwichSummary): string =>
  avg_rating === null ? 'Not yet rated' : `★ ${String(avg_rating)} (${String(rating_count)})`

export const sandwichCard = (sandwich: SandwichSummary): string =>
  [
    `<li><a href="/sandwiches/${escapeHtml(sandwich.slug)}" class="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md">`,
    sandwich.image_url === null
      ? '<div aria-hidden="true" class="flex h-40 items-center justify-center bg-neutral-100 text-5xl">🥪</div>'
      : `<img src="${escapeHtml(sandwich.image_url)}" alt="${escapeHtml(sandwich.name)}" class="h-40 w-full object-cover" />`,
    '<div class="flex flex-1 flex-col gap-1 p-4">',
    `<h2 class="font-display text-lg font-bold text-neutral-900">${escapeHtml(sandwich.name)}</h2>`,
    sandwich.alternative_names.length === 0
      ? ''
      : `<p class="text-xs italic text-neutral-500">Also known as: ${escapeHtml(sandwich.alternative_names.join(', '))}</p>`,
    sandwich.origin_country === null
      ? ''
      : `<p class="text-xs font-medium uppercase tracking-wide text-neutral-500">${escapeHtml(sandwich.origin_country)}</p>`,
    sandwich.description === null
      ? ''
      : `<p class="line-clamp-3 text-sm text-neutral-600">${escapeHtml(sandwich.description)}</p>`,
    `<p class="mt-auto pt-2 text-sm text-neutral-700">${ratingLine(sandwich)}</p>`,
    '</div></a></li>',
  ].join('')

export const loadMoreButton = (shown: number, total: number): string =>
  shown < total
    ? '<div class="mt-8 text-center"><button type="button" class="rounded-md border border-neutral-300 px-6 py-2 text-sm font-medium disabled:opacity-50">Load more</button></div>'
    : ''
