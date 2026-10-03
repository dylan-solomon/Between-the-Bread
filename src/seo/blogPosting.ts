import type { BlogPost } from '../api/blog'

export const postDescription = (post: BlogPost): string => post.meta_description ?? post.excerpt

export const blogPostingData = ({ post, pageUrl }: { post: BlogPost; pageUrl: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: postDescription(post),
  ...(post.cover_image_url === null ? {} : { image: post.cover_image_url }),
  datePublished: post.published_at,
  dateModified: post.updated_at,
  author: { '@type': 'Person', name: post.author_name },
  publisher: { '@type': 'Organization', name: 'Between the Bread' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
})
