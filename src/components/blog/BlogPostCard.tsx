import { Link } from 'react-router-dom'
import type { BlogPostSummary } from '@/api/blog'
import CategoryBadge from '@/components/blog/CategoryBadge'
import { formatPostDate } from '@/utils/blogPost'

type Props = { post: BlogPostSummary }

export default function BlogPostCard({ post }: Props) {
  return (
    <li className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md">
      {post.cover_image_url === null ? (
        <div aria-hidden="true" className="flex h-40 items-center justify-center bg-neutral-100 text-5xl">🥪</div>
      ) : (
        <img src={post.cover_image_url} alt="" loading="lazy" decoding="async" className="h-40 w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="font-display text-lg font-bold text-neutral-900">
          <Link to={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-sm text-neutral-600">{post.excerpt}</p>
        <p className="text-xs text-neutral-500">
          <span>{formatPostDate(post.published_at)}</span>
          {' · '}
          <span>{`${String(post.reading_time_minutes)} min read`}</span>
        </p>
        {post.categories.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-2 pt-1">
            {post.categories.map((category) => (
              <li key={category.slug}>
                <CategoryBadge
                  category={category}
                  className="relative z-10 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
