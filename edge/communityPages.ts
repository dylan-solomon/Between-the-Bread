import type {
  CommunityMaker,
  CommunityPage,
  CommunitySandwich,
  CommunitySandwichSummary,
} from '../src/api/community'
import { CATEGORY_LABELS } from '../src/data/categoryLabels'
import {
  DIETARY_DISCLAIMER,
  DIETARY_TAGS,
  getDietaryTag,
  isDietaryTag,
} from '../src/data/dietaryTags'
import {
  communityDescription,
  communityGroups,
  madeLabel,
  rankBadge,
} from '../src/seo/communitySandwich'
import { COMMUNITY_DESCRIPTION, COMMUNITY_TITLE } from '../src/seo/listPages'
import type { CommunityComposition } from '../src/api/community'
import { formatPostDate } from '../src/utils/blogPost'
import { SANDWICH_CONTAINER_CLASSES, sandwichLayers } from '../src/utils/sandwichLayers'
import type { LayerSize } from '../src/utils/sandwichLayers'
import { loadMoreButton } from './cards'
import { escapeHtml, metaTag, titleTag, twitterTags } from './html'
import type { Page } from './page'
import { ratingHtml } from './rating'

const ADMIN_BADGE =
  '<span class="ml-1.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider text-primary">Admin</span>'

const SORT_LABELS = ['Top Rated', 'Most Popular', 'Trending', 'Newest']

const sandwichPicture = (composition: CommunityComposition, size: LayerSize): string => {
  const layers = sandwichLayers({
    composition: {
      bread: composition.bread ?? [],
      protein: composition.protein,
      cheese: composition.cheese,
      toppings: composition.toppings,
      condiments: composition.condiments,
      'chefs-special': composition['chefs-special'],
    },
    size,
    animate: false,
  })
  return `<div class="${SANDWICH_CONTAINER_CLASSES[size]}">${layers
    .map(
      (layer) => `<div role="img" aria-label="${escapeHtml(layer.label)}" class="${layer.className}"></div>`,
    )
    .join('')}</div>`
}

const dietaryBadges = (tags: string[], badgeClass: string): string =>
  tags
    .filter(isDietaryTag)
    .map(getDietaryTag)
    .map(
      ({ label, kind }) =>
        `<li class="${badgeClass} ${kind === 'avoid' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'}">${escapeHtml(label)}</li>`,
    )
    .join('')

const firstMade = (sandwich: CommunitySandwich): string => {
  const date = formatPostDate(sandwich.created_at)
  const maker: CommunityMaker | null = sandwich.first_made_by
  if (maker === null) return `<p class="text-sm text-neutral-600">First made on ${date}</p>`
  return [
    '<p class="text-sm text-neutral-600">First made by ',
    `<a href="/u/${escapeHtml(maker.username)}" class="font-medium text-neutral-900 hover:text-primary hover:underline">@${escapeHtml(maker.username)}</a>`,
    maker.is_admin ? ADMIN_BADGE : '',
    ` on ${date}</p>`,
  ].join('')
}

const ingredientList = (composition: CommunityComposition): string =>
  [
    '<div><h2 class="font-display text-lg font-bold text-neutral-900">Ingredients</h2><dl class="mt-2 space-y-2">',
    communityGroups(composition)
      .map(
        ({ slug, items }) =>
          `<div><dt class="text-sm font-semibold text-neutral-700">${escapeHtml(CATEGORY_LABELS[slug])}</dt><dd class="text-sm text-neutral-600">${items
            .map((item) => `<span class="mr-2 inline-block">${escapeHtml(item.name)}</span>`)
            .join('')}</dd></div>`,
      )
      .join(''),
    '</dl></div>',
  ].join('')

const sandwichHtml = (sandwich: CommunitySandwich): string => {
  const badges = dietaryBadges(sandwich.dietary_tags, 'rounded-full px-3 py-1 text-xs')
  return [
    '<div class="mx-auto max-w-[720px] px-4 py-12">',
    '<div class="text-center">',
    `<h1 class="font-display text-3xl font-bold text-neutral-900">${escapeHtml(sandwich.fun_name ?? sandwich.name)}</h1>`,
    sandwich.fun_name === null
      ? ''
      : `<p class="mt-1 font-display text-lg italic text-neutral-500">${escapeHtml(sandwich.name)}</p>`,
    '</div>',
    `<div class="mt-6">${sandwichPicture(sandwich.composition, 'regular')}</div>`,
    `<div class="mt-4 flex justify-center">${ratingHtml(sandwich)}</div>`,
    '<div class="mt-8"><div class="space-y-6">',
    `<div class="space-y-1"><p class="text-sm font-medium uppercase tracking-wide text-neutral-500">${madeLabel(sandwich.generated_count)}</p>${firstMade(sandwich)}</div>`,
    ingredientList(sandwich.composition),
    badges === ''
      ? ''
      : `<div><ul class="flex flex-wrap gap-2">${badges}</ul><p class="mt-2 text-xs text-neutral-400">${escapeHtml(DIETARY_DISCLAIMER)}</p></div>`,
    '</div></div>',
    '</div>',
  ].join('')
}

export const communitySandwichPage = ({
  sandwich,
  origin,
}: {
  sandwich: CommunitySandwich
  origin: string
}): Page => {
  const path = `/community/${sandwich.slug}`
  const pageUrl = `${origin}${path}`
  const title = sandwich.fun_name ?? sandwich.name
  const description = communityDescription(sandwich)

  return {
    tags: [
      titleTag(`${title} | Community | Between the Bread`),
      metaTag('og:title', title),
      metaTag('og:description', description),
      metaTag('og:url', pageUrl),
      metaTag('og:type', 'article'),
      ...twitterTags({ title, description, image: null }),
    ],
    search: { description, canonical: pageUrl, noindex: sandwich.rating_count === 0 },
    content: { html: sandwichHtml(sandwich), path, data: sandwich },
  }
}

const communityCard = (sandwich: CommunitySandwichSummary): string => {
  const badge = rankBadge(sandwich.rank)
  const tags = dietaryBadges(sandwich.dietary_tags, 'rounded-full px-2 py-0.5 text-xs')
  return [
    `<li><a href="/community/${escapeHtml(sandwich.slug)}" class="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md">`,
    `<span aria-label="${badge.label}" class="${badge.className}">${badge.text}</span>`,
    `<div class="bg-neutral-50 pt-4">${sandwichPicture(sandwich.composition, 'compact')}</div>`,
    '<div class="flex flex-1 flex-col gap-1 p-4">',
    `<h2 class="font-display text-lg font-bold text-neutral-900">${escapeHtml(sandwich.name)}</h2>`,
    sandwich.fun_name === null
      ? ''
      : `<p class="text-sm italic text-neutral-500">${escapeHtml(sandwich.fun_name)}</p>`,
    `<p class="text-sm text-neutral-700">${sandwich.avg_rating === null ? 'Not yet rated' : `★ ${String(sandwich.avg_rating)} (${String(sandwich.rating_count)})`}</p>`,
    `<p class="text-sm text-neutral-500">${madeLabel(sandwich.generated_count)}</p>`,
    tags === '' ? '' : `<ul class="mt-auto flex flex-wrap gap-1.5 pt-2">${tags}</ul>`,
    '</div></a></li>',
  ].join('')
}

const INPUT_CLASS = 'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm'

const sortButtons = (): string =>
  `<div role="group" aria-label="Sort by" class="mt-6 flex flex-wrap gap-2">${SORT_LABELS.map(
    (label) => {
      const active = label === 'Most Popular'
      return `<button type="button" aria-pressed="${String(active)}" class="rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
      }">${label}</button>`
    },
  ).join('')}</div>`

const filters = (): string =>
  [
    '<div class="mt-4 flex flex-wrap items-center gap-4">',
    `<label class="flex items-center gap-2 text-sm text-neutral-700">Ingredient <select class="${INPUT_CLASS}"><option value="">Any ingredient</option></select></label>`,
    '<fieldset class="flex flex-wrap gap-3"><legend class="sr-only">Dietary</legend>',
    DIETARY_TAGS.map(
      ({ filterLabel }) =>
        `<label class="flex items-center gap-1 text-sm text-neutral-700"><input type="checkbox" />${escapeHtml(filterLabel)}</label>`,
    ).join(''),
    '</fieldset></div>',
    `<p class="mt-2 text-xs text-neutral-400">${escapeHtml(DIETARY_DISCLAIMER)}</p>`,
  ].join('')

const leaderboardHtml = ({ items, totalCount }: CommunityPage): string =>
  [
    '<div class="mx-auto max-w-5xl px-4 py-10">',
    '<h1 class="font-display text-3xl font-bold text-neutral-900">Community Leaderboard</h1>',
    `<p class="mt-2 text-neutral-600">${escapeHtml(COMMUNITY_DESCRIPTION)}</p>`,
    sortButtons(),
    filters(),
    '<div class="mt-8">',
    items.length === 0
      ? ''
      : `<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">${items.map(communityCard).join('')}</ul>${loadMoreButton(items.length, totalCount)}`,
    '</div></div>',
  ].join('')

export const communityIndexPage = ({
  page,
  origin,
}: {
  page: CommunityPage
  origin: string
}): Page => ({
  tags: [
    titleTag(COMMUNITY_TITLE),
    metaTag('og:title', COMMUNITY_TITLE),
    metaTag('og:description', COMMUNITY_DESCRIPTION),
    metaTag('og:url', `${origin}/community`),
    metaTag('og:type', 'website'),
  ],
  search: { description: COMMUNITY_DESCRIPTION, canonical: `${origin}/community` },
  content: { html: leaderboardHtml(page), path: '/community', data: page },
})
