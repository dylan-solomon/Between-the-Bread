import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { captureBlogPostShared, captureBlogPostViewed, captureBlogRelatedSandwichClicked } from '@/analytics/events'
import { fetchBlogPost, isBlogPost } from '@/api/blog'
import type { BlogPost as BlogPostData, RelatedSandwich } from '@/api/blog'
import BlogPostCard from '@/components/blog/BlogPostCard'
import CategoryBadge from '@/components/blog/CategoryBadge'
import MarkdownText from '@/components/MarkdownText'
import CommentSection from '@/components/sandwich-page/CommentSection'
import { SITE_URL } from '@/data/site'
import { formatPostDate } from '@/utils/blogPost'
import { readInitialData } from '@/utils/initialData'
import { blogPostingData, postDescription } from '@/seo/blogPosting'
import { scriptJson } from '@/seo/scriptJson'

type State =
  | { status: 'loading' }
  | { status: 'ready'; post: BlogPostData }
  | { status: 'not-found' }
  | { status: 'error' }

const postSentWithPage = (slug: string): BlogPostData | undefined =>
  readInitialData({ path: `/blog/${slug}`, isData: isBlogPost })

const viewed = (post: BlogPostData): void => {
  captureBlogPostViewed({ slug: post.slug, categories: post.categories.map((category) => category.slug) })
}

function RelatedSandwichCard({ sandwich, onOpen }: { sandwich: RelatedSandwich; onOpen: () => void }) {
  return (
    <li>
      <Link
        to={`/sandwiches/${sandwich.slug}`}
        onClick={onOpen}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:shadow-md"
      >
        {sandwich.image_url === null ? (
          <div aria-hidden="true" className="flex h-28 items-center justify-center bg-neutral-100 text-4xl">🥪</div>
        ) : (
          <img src={sandwich.image_url} alt="" loading="lazy" decoding="async" className="h-28 w-full object-cover" />
        )}
        <div className="p-3">
          <h3 className="font-display text-base font-bold text-neutral-900">{sandwich.name}</h3>
          {sandwich.description !== null && (
            <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{sandwich.description}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

export default function BlogPost() {
  const { slug = '' } = useParams()
  const [state, setState] = useState<State>(() => {
    const sent = postSentWithPage(slug)
    return sent === undefined ? { status: 'loading' } : { status: 'ready', post: sent }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const sent = postSentWithPage(slug)
    if (sent !== undefined) {
      setState({ status: 'ready', post: sent })
      viewed(sent)
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    fetchBlogPost(slug)
      .then((post) => {
        if (cancelled) return
        setState(post === null ? { status: 'not-found' } : { status: 'ready', post })
        if (post !== null) viewed(post)
      })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [slug, attempt])

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
      captureBlogPostShared({ slug })
    } catch {
      toast.error('Failed to copy link. Please try again.')
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <div role="status" aria-label="Loading post" className="text-center text-neutral-500">Loading…</div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <div role="alert" className="text-center text-neutral-600">
          <p>Something went wrong loading this post.</p>
          <button
            type="button"
            onClick={() => { setAttempt((prev) => prev + 1) }}
            className="mt-3 rounded-md border border-neutral-300 px-4 py-1.5 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (state.status === 'not-found') {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
        <Helmet>
          <title>Post not found | Between the Bread</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="font-display text-2xl font-bold text-neutral-900">Post not found</h1>
        <Link
          to="/blog"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Browse the blog
        </Link>
      </div>
    )
  }

  const { post } = state
  const pageUrl = `${SITE_URL}/blog/${post.slug}`
  const description = postDescription(post)

  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <Helmet>
        <title>{`${post.title} | Between the Bread`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={description} />
        {post.cover_image_url !== null && <meta property="og:image" content={post.cover_image_url} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.published_at} />
        <script type="application/ld+json">{scriptJson(blogPostingData({ post, pageUrl }))}</script>
      </Helmet>

      <article>
        {post.categories.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <li key={category.slug}>
                <CategoryBadge
                  category={category}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                />
              </li>
            ))}
          </ul>
        )}

        <h1 className="mt-4 font-display text-3xl font-bold text-neutral-900">{post.title}</h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            <span>{`By ${post.author_name}`}</span>
            {' · '}
            <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
            {' · '}
            <span>{`${String(post.reading_time_minutes)} min read`}</span>
          </p>
          <button
            type="button"
            onClick={() => { void handleShare() }}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Share
          </button>
        </div>

        {post.cover_image_url !== null && (
          <img src={post.cover_image_url} alt="" className="mt-6 aspect-video w-full rounded-lg object-cover" />
        )}

        <div className="mt-8">
          <MarkdownText>{post.body}</MarkdownText>
        </div>
      </article>

      <div className="mt-12 border-t border-neutral-200 pt-8">
        <CommentSection targetType="blog" slug={post.slug} targetId={post.id} />
      </div>

      {post.related_sandwiches.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-neutral-900">Sandwiches in this post</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {post.related_sandwiches.map((sandwich) => (
              <RelatedSandwichCard
                key={sandwich.slug}
                sandwich={sandwich}
                onOpen={() => { captureBlogRelatedSandwichClicked({ postSlug: post.slug, sandwichSlug: sandwich.slug }) }}
              />
            ))}
          </ul>
        </section>
      )}

      {post.more_posts.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-neutral-900">More from the blog</h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {post.more_posts.map((other) => <BlogPostCard key={other.slug} post={other} />)}
          </ul>
        </section>
      )}
    </div>
  )
}
