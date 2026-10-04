export type EventFilter = { key: string; value: string | number | boolean }

export type Series = { event: string; filters?: EventFilter[] }

export type Chart =
  | {
      kind: 'trend'
      name: string
      description: string
      series: Series[]
      breakdown?: string
      display: 'line' | 'bar' | 'table'
      days: number
    }
  | {
      kind: 'funnel'
      name: string
      description: string
      steps: Series[]
      windowDays: number
      days: number
    }

export type Dashboard = { name: string; description: string; charts: Chart[] }

export type CohortRule = { event: string; atLeast: number; withinDays: number }

export type Cohort = { name: string; description: string; anyOf: CohortRule[][] }

const LAST_30_DAYS = 30
const LAST_90_DAYS = 90
const LAST_YEAR = 365

const on = (targetType: 'database' | 'community' | 'blog'): EventFilter[] => [{ key: 'target_type', value: targetType }]

export const COHORTS: Cohort[] = [
  {
    name: 'Power users',
    description: 'Saved 10 or more sandwiches in the last year and visited in the last 7 days.',
    anyOf: [
      [
        { event: 'history_sandwich_saved', atLeast: 10, withinDays: LAST_YEAR },
        { event: '$pageview', atLeast: 1, withinDays: 7 },
      ],
    ],
  },
  {
    name: 'Sharers',
    description: 'Created 3 or more share links in the last year. Shares are anonymous, so this only counts people who were signed in.',
    anyOf: [[{ event: 'share_link_created', atLeast: 3, withinDays: LAST_YEAR }]],
  },
  {
    name: 'Raters',
    description: 'Rated 5 or more sandwiches in the last year, either on a sandwich page or in the generator.',
    anyOf: [
      [{ event: 'sandwich_rated', atLeast: 5, withinDays: LAST_YEAR }],
      [{ event: 'history_sandwich_rated', atLeast: 5, withinDays: LAST_YEAR }],
    ],
  },
  {
    name: 'Explorers',
    description: 'Opened 10 or more encyclopedia entries in the last year.',
    anyOf: [[{ event: 'encyclopedia_entry_viewed', atLeast: 10, withinDays: LAST_YEAR }]],
  },
  {
    name: 'Community contributors',
    description: 'Posted 3 or more comments, or uploaded 3 or more photos, in the last year.',
    anyOf: [
      [{ event: 'comment_posted', atLeast: 3, withinDays: LAST_YEAR }],
      [{ event: 'photo_uploaded', atLeast: 3, withinDays: LAST_YEAR }],
    ],
  },
]

export const DASHBOARDS: Dashboard[] = [
  {
    name: 'Encyclopedia',
    description: 'How people browse, search and engage with the sandwich encyclopedia.',
    charts: [
      {
        kind: 'trend',
        name: 'Encyclopedia visits',
        description: 'Visits to the encyclopedia list and to individual entries, per day.',
        series: [{ event: 'encyclopedia_viewed' }, { event: 'encyclopedia_entry_viewed' }],
        display: 'line',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Most viewed entries',
        description: 'Which entries people open most.',
        series: [{ event: 'encyclopedia_entry_viewed' }],
        breakdown: 'slug',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Encyclopedia search words',
        description: 'What people type into the encyclopedia search box.',
        series: [{ event: 'encyclopedia_searched' }],
        breakdown: 'query',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Ratings given on entries',
        description: 'Stars given on encyclopedia pages, split by score.',
        series: [{ event: 'sandwich_rated', filters: on('database') }],
        breakdown: 'score',
        display: 'bar',
        days: LAST_90_DAYS,
      },
      {
        kind: 'trend',
        name: 'Comments and photos on entries',
        description: 'Comments posted and photos uploaded on encyclopedia pages, per day.',
        series: [
          { event: 'comment_posted', filters: on('database') },
          { event: 'photo_uploaded', filters: on('database') },
        ],
        display: 'line',
        days: LAST_90_DAYS,
      },
    ],
  },
  {
    name: 'Community',
    description: 'How people use the community leaderboard and community sandwich pages.',
    charts: [
      {
        kind: 'trend',
        name: 'Leaderboard visits',
        description: 'Visits to the leaderboard and to community sandwich pages, per day.',
        series: [{ event: 'community_viewed' }, { event: 'community_entry_viewed' }],
        display: 'line',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Sort mode split',
        description: 'Which leaderboard sort people switch to.',
        series: [{ event: 'community_sorted' }],
        breakdown: 'sort',
        display: 'bar',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Most viewed community sandwiches',
        description: 'Which community sandwiches people open most.',
        series: [{ event: 'community_entry_viewed' }],
        breakdown: 'slug',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Community contributions',
        description: 'Ratings, comments and photos on community sandwiches, per day.',
        series: [
          { event: 'sandwich_rated', filters: on('community') },
          { event: 'comment_posted', filters: on('community') },
          { event: 'photo_uploaded', filters: on('community') },
        ],
        display: 'line',
        days: LAST_90_DAYS,
      },
    ],
  },
  {
    name: 'Search',
    description: 'What people search for and whether they find it.',
    charts: [
      {
        kind: 'trend',
        name: 'Searches',
        description: 'Searches per day, split by header box and results page.',
        series: [{ event: 'search_performed' }],
        breakdown: 'surface',
        display: 'line',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Top search words',
        description: 'The most common searches.',
        series: [{ event: 'search_performed' }],
        breakdown: 'query',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Searches with no results',
        description: 'Searches that found nothing. These show content people want that the site does not have.',
        series: [{ event: 'search_performed', filters: [{ key: 'results_count', value: 0 }] }],
        breakdown: 'query',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'funnel',
        name: 'Search click-through',
        description: 'How often a search leads to someone clicking a result.',
        steps: [{ event: 'search_performed' }, { event: 'search_result_clicked' }],
        windowDays: 1,
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Clicked results by source',
        description: 'Which kind of result people click: Classic Sandwich, Community, Blog or My History.',
        series: [{ event: 'search_result_clicked' }],
        breakdown: 'result_source',
        display: 'bar',
        days: LAST_30_DAYS,
      },
    ],
  },
  {
    name: 'Blog',
    description: 'Which posts people read and what they do next.',
    charts: [
      {
        kind: 'trend',
        name: 'Post views',
        description: 'Blog post views per day.',
        series: [{ event: 'blog_post_viewed' }],
        display: 'line',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Top posts',
        description: 'Which posts get read most.',
        series: [{ event: 'blog_post_viewed' }],
        breakdown: 'slug',
        display: 'table',
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Category split',
        description: 'Which blog categories people pick.',
        series: [{ event: 'blog_category_selected' }],
        breakdown: 'category',
        display: 'bar',
        days: LAST_30_DAYS,
      },
      {
        kind: 'funnel',
        name: 'Related sandwich click-through',
        description: 'How often reading a post leads to opening a sandwich it mentions.',
        steps: [{ event: 'blog_post_viewed' }, { event: 'blog_related_sandwich_clicked' }],
        windowDays: 1,
        days: LAST_30_DAYS,
      },
      {
        kind: 'trend',
        name: 'Post shares',
        description: 'How often posts are shared, per day.',
        series: [{ event: 'blog_post_shared' }],
        display: 'line',
        days: LAST_30_DAYS,
      },
    ],
  },
  {
    name: 'Phase 4 funnels',
    description: 'The key paths through the Phase 4 features.',
    charts: [
      {
        kind: 'funnel',
        name: 'Encyclopedia to rating',
        description: 'Encyclopedia list, then an entry, then rating it.',
        steps: [{ event: 'encyclopedia_viewed' }, { event: 'encyclopedia_entry_viewed' }, { event: 'sandwich_rated', filters: on('database') }],
        windowDays: 7,
        days: LAST_90_DAYS,
      },
      {
        kind: 'funnel',
        name: 'Leaderboard to Try This',
        description: 'Leaderboard, then a community sandwich, then trying it in the generator.',
        steps: [{ event: 'community_viewed' }, { event: 'community_entry_viewed' }, { event: 'community_try_this_clicked' }],
        windowDays: 7,
        days: LAST_90_DAYS,
      },
      {
        kind: 'funnel',
        name: 'Search to save',
        description: 'A search, then clicking a result, then saving a sandwich.',
        steps: [{ event: 'search_performed' }, { event: 'search_result_clicked' }, { event: 'history_sandwich_saved' }],
        windowDays: 7,
        days: LAST_90_DAYS,
      },
      {
        kind: 'funnel',
        name: 'Generate, save, share',
        description: 'Building a sandwich, then saving it, then sharing it.',
        steps: [{ event: 'generator_sandwich_completed' }, { event: 'history_sandwich_saved' }, { event: 'share_link_created' }],
        windowDays: 1,
        days: LAST_90_DAYS,
      },
    ],
  },
]
