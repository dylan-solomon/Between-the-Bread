import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { captureBlogViewed } from '@/analytics/events'
import BlogCategoryNav from '@/components/blog/BlogCategoryNav'
import BlogPostList from '@/components/blog/BlogPostList'
import { SITE_URL } from '@/data/site'
import { isBlogListing } from '@/api/blog'
import { useBlogCategories } from '@/hooks/useBlogCategories'
import { BLOG_DESCRIPTION as DESCRIPTION, BLOG_TITLE as TITLE } from '@/seo/listPages'
import { readInitialData } from '@/utils/initialData'

export default function BlogIndex() {
  const [sent] = useState(() => readInitialData({ path: '/blog', isData: isBlogListing }))
  const { status, categories } = useBlogCategories(sent?.categories)

  useEffect(() => { captureBlogViewed() }, [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <link rel="alternate" type="application/rss+xml" title="Between the Bread Blog" href={`${SITE_URL}/blog/rss.xml`} />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">Blog</h1>
      <p className="mt-2 text-neutral-600">Sandwich stories, guides and ideas.</p>

      {status === 'ready' && <BlogCategoryNav categories={categories} />}

      <BlogPostList initial={sent?.posts} />
    </div>
  )
}
