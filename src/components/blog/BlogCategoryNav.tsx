import { Link } from 'react-router-dom'
import { captureBlogCategorySelected } from '@/analytics/events'
import type { BlogCategory } from '@/api/blog'

type Props = {
  categories: BlogCategory[]
  activeSlug?: string
}

const linkClass = (active: boolean): string =>
  `rounded-full border px-4 py-1.5 text-sm font-medium transition ${
    active
      ? 'border-primary bg-primary text-white'
      : 'border-neutral-300 bg-white text-neutral-700 hover:border-primary hover:text-primary'
  }`

export default function BlogCategoryNav({ categories, activeSlug }: Props) {
  const withPosts = categories.filter((category) => category.post_count > 0)

  return (
    <nav aria-label="Blog categories" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        <li>
          <Link to="/blog" aria-current={activeSlug === undefined ? 'page' : undefined} className={linkClass(activeSlug === undefined)}>
            All
          </Link>
        </li>
        {withPosts.map((category) => (
          <li key={category.slug}>
            <Link
              to={`/blog/category/${category.slug}`}
              aria-current={category.slug === activeSlug ? 'page' : undefined}
              onClick={() => { captureBlogCategorySelected({ category: category.slug }) }}
              className={linkClass(category.slug === activeSlug)}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
