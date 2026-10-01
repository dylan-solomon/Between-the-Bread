import { Link } from 'react-router-dom'
import { captureBlogCategorySelected } from '@/analytics/events'
import type { BlogCategorySummary } from '@/api/blog'

type Props = {
  category: BlogCategorySummary
  className: string
}

export default function CategoryBadge({ category, className }: Props) {
  return (
    <Link
      to={`/blog/category/${category.slug}`}
      onClick={() => { captureBlogCategorySelected({ category: category.slug }) }}
      className={className}
    >
      {category.name}
    </Link>
  )
}
