import type { BlogCategory } from '../api/blog'

export const ENCYCLOPEDIA_TITLE = 'Sandwich Encyclopedia | Between the Bread'
export const ENCYCLOPEDIA_DESCRIPTION = 'Iconic sandwiches from around the world, and the stories behind them.'

export const BLOG_TITLE = 'Blog | Between the Bread'
export const BLOG_DESCRIPTION = 'Sandwich stories, guides and ideas from Between the Bread.'

export const categoryTitle = (category: BlogCategory): string => `${category.name} | Blog | Between the Bread`

export const categoryDescription = (category: BlogCategory): string =>
  category.description ?? `${category.name} posts from Between the Bread.`

export const COMMUNITY_TITLE = 'Community Leaderboard | Between the Bread'
export const COMMUNITY_DESCRIPTION = 'The sandwiches people have made most on Between the Bread, ranked by the community.'
