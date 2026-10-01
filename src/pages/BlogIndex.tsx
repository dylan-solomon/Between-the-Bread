import { Helmet } from 'react-helmet-async'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'
import BlogPostList from '@/components/blog/BlogPostList'
import { SITE_URL } from '@/data/site'
import { useBlogCategories } from '@/hooks/useBlogCategories'

const TITLE = 'Blog | Between the Bread'
const DESCRIPTION = 'Sandwich stories, guides and ideas from Between the Bread.'

export default function BlogIndex() {
  const { status, categories } = useBlogCategories()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">Blog</h1>
      <p className="mt-2 text-neutral-600">Sandwich stories, guides and ideas.</p>

      {status === 'ready' && <BlogCategoryNav categories={categories} />}

      <BlogPostList />
    </div>
  )
}
