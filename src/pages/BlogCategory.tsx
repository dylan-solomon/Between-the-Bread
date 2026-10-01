import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'
import BlogPostList from '@/components/blog/BlogPostList'
import { SITE_URL } from '@/data/site'
import { useBlogCategories } from '@/hooks/useBlogCategories'

export default function BlogCategory() {
  const { slug = '' } = useParams()
  const { status, categories, retry } = useBlogCategories()
  const category = categories.find((candidate) => candidate.slug === slug && candidate.post_count > 0)

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div role="status" aria-label="Loading category" className="text-center text-neutral-400">Loading…</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div role="alert" className="text-center text-neutral-600">
          <p>Something went wrong loading this category.</p>
          <button type="button" onClick={retry} className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm">
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (category === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center">
        <Helmet>
          <title>Category not found | Between the Bread</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <p className="text-neutral-600">Category not found.</p>
        <Link to="/blog" className="mt-3 inline-block text-primary underline">Back to the blog</Link>
      </div>
    )
  }

  const title = `${category.name} | Blog | Between the Bread`
  const description = category.description ?? `${category.name} posts from Between the Bread.`

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <link rel="canonical" href={`${SITE_URL}/blog/category/${category.slug}`} />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">{category.name}</h1>
      {category.description !== null && <p className="mt-2 text-neutral-600">{category.description}</p>}

      <BlogCategoryNav categories={categories} activeSlug={category.slug} />

      <BlogPostList category={category.slug} />
    </div>
  )
}
