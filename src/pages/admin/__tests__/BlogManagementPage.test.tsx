import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { toast } from 'sonner'

const {
  mockUseAuth, mockFetchPosts, mockFetchCategories, mockCreate, mockUpdate, mockDelete,
  mockUploadImage, mockFetchSandwiches, mockFetchSandwich,
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUploadImage: vi.fn(),
  mockFetchSandwiches: vi.fn(),
  mockFetchSandwich: vi.fn(),
  mockFetchPosts: vi.fn(),
  mockFetchCategories: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/admin', () => ({
  fetchAdminPosts: mockFetchPosts,
  fetchBlogCategories: mockFetchCategories,
  createPost: mockCreate,
  updatePost: mockUpdate,
  deletePost: mockDelete,
}))
vi.mock('@/api/images', () => ({
  uploadImage: mockUploadImage,
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
}))
vi.mock('@/api/database', () => ({
  fetchSandwiches: mockFetchSandwiches,
  fetchSandwich: mockFetchSandwich,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import BlogManagementPage from '@/pages/admin/BlogManagementPage'
import { toDateTimeLocal } from '@/utils/blogPost'

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: 'p-1',
  slug: 'vegan-builds',
  title: 'Vegan builds',
  excerpt: 'Five builds.',
  body: 'Some **bold** words.',
  cover_image_url: null,
  related_sandwich_slugs: [],
  author_name: 'Dylan',
  meta_description: null,
  reading_time_minutes: 1,
  published: false,
  published_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  categories: [],
  ...overrides,
})

const draft = makePost()
const live = makePost({
  id: 'p-2',
  slug: 'pairings-guide',
  title: 'Pairings guide',
  published: true,
  published_at: '2020-05-01T12:00:00.000Z',
  categories: [{ slug: 'best-pairings', name: 'Best Pairings' }],
})
const scheduled = makePost({
  id: 'p-3',
  slug: 'summer-ideas',
  title: 'Summer ideas',
  published: true,
  published_at: '2999-06-01T12:00:00.000Z',
  categories: [{ slug: 'sandwich-ideas', name: 'Sandwich Ideas' }, { slug: 'dietary', name: 'Dietary' }],
})

const categories = [
  { id: 'c-1', slug: 'sandwich-ideas', name: 'Sandwich Ideas', description: null, display_order: 1, post_count: 1 },
  { id: 'c-2', slug: 'best-pairings', name: 'Best Pairings', description: null, display_order: 2, post_count: 1 },
  { id: 'c-3', slug: 'dietary', name: 'Dietary', description: null, display_order: 3, post_count: 1 },
]

const renderRoute = () => {
  const router = createMemoryRouter([
    { path: '/', element: <BlogManagementPage /> },
    { path: '/other', element: <p>Other page</p> },
  ])
  render(<RouterProvider router={router} />)
  return router
}

const renderPage = async () => {
  const router = renderRoute()
  await screen.findByText('Vegan builds')
  return router
}

beforeEach(() => {
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ session: { access_token: 'token-abc' } })
  mockFetchPosts.mockResolvedValue([draft, live, scheduled])
  mockFetchCategories.mockResolvedValue(categories)
  mockFetchSandwiches.mockResolvedValue({ items: [], totalCount: 0 })
  mockFetchSandwich.mockResolvedValue(null)
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('BlogManagementPage list', () => {
  it('shows each post with its status, categories and publish date', async () => {
    await renderPage()

    const draftRow = screen.getByRole('row', { name: /Vegan builds/ })
    expect(within(draftRow).getByText('Draft')).toBeInTheDocument()

    const liveRow = screen.getByRole('row', { name: /Pairings guide/ })
    expect(within(liveRow).getByText('Published')).toBeInTheDocument()
    expect(within(liveRow).getByText('Best Pairings')).toBeInTheDocument()
    expect(within(liveRow).getByText(new Date('2020-05-01T12:00:00.000Z').toLocaleDateString())).toBeInTheDocument()

    const scheduledRow = screen.getByRole('row', { name: /Summer ideas/ })
    expect(within(scheduledRow).getByText('Scheduled')).toBeInTheDocument()
    expect(within(scheduledRow).getByText('Sandwich Ideas, Dietary')).toBeInTheDocument()
  })

  it('loads posts and categories with the session token', async () => {
    await renderPage()

    expect(mockFetchPosts).toHaveBeenCalledWith('token-abc')
    expect(mockFetchCategories).toHaveBeenCalledWith('token-abc')
  })

  it('finds posts by title', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('Search posts'), 'pairings')

    expect(screen.getByText('Pairings guide')).toBeInTheDocument()
    expect(screen.queryByText('Vegan builds')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 3 posts')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.selectOptions(screen.getByLabelText('Filter by status'), 'Scheduled')

    expect(screen.getByText('Summer ideas')).toBeInTheDocument()
    expect(screen.queryByText('Vegan builds')).not.toBeInTheDocument()
    expect(screen.queryByText('Pairings guide')).not.toBeInTheDocument()
  })

  it('says so when no post matches the filters', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.type(screen.getByLabelText('Search posts'), 'zzz')

    expect(screen.getByText('No posts match these filters.')).toBeInTheDocument()
  })

  it('shows an empty message when there are no posts', async () => {
    mockFetchPosts.mockResolvedValue([])
    renderRoute()

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument()
  })

  it('shows an error when posts cannot be loaded', async () => {
    mockFetchPosts.mockRejectedValue(new Error('nope'))
    renderRoute()

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to load posts.') })
  })
})

describe('BlogManagementPage deleting', () => {
  it('offers delete only for posts that are not published', async () => {
    await renderPage()

    expect(screen.getByRole('button', { name: 'Delete Vegan builds' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Pairings guide' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Summer ideas' })).not.toBeInTheDocument()
  })

  it('deletes a draft after confirmation', async () => {
    mockDelete.mockResolvedValue({ slug: 'vegan-builds', deleted: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Vegan builds' }))

    expect(window.confirm).toHaveBeenCalledWith('Permanently delete "Vegan builds"? This cannot be undone.')
    expect(mockDelete).toHaveBeenCalledWith('token-abc', 'vegan-builds')
    await waitFor(() => { expect(screen.queryByText('Vegan builds')).not.toBeInTheDocument() })
    expect(toast.success).toHaveBeenCalledWith('Post deleted.')
  })

  it('does nothing when the confirmation is declined', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Vegan builds' }))

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('shows an error when deleting fails', async () => {
    mockDelete.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete Vegan builds' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to delete post.') })
    expect(screen.getByText('Vegan builds')).toBeInTheDocument()
  })
})

describe('BlogManagementPage creating a post', () => {
  const openEditor = async (user: ReturnType<typeof userEvent.setup>) => {
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'New post' }))
  }

  it('suggests the slug from the title until the slug is edited', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Best Cheese Ever')
    expect(screen.getByLabelText('Slug')).toHaveValue('best-cheese-ever')

    await user.clear(screen.getByLabelText('Slug'))
    await user.type(screen.getByLabelText('Slug'), 'my-own-slug')
    await user.type(screen.getByLabelText('Title'), ' Again')

    expect(screen.getByLabelText('Slug')).toHaveValue('my-own-slug')
  })

  it('saves a draft with the fields entered and the chosen categories', async () => {
    mockCreate.mockResolvedValue(makePost({ id: 'p-9', slug: 'best-cheese-ever', title: 'Best Cheese Ever' }))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Best Cheese Ever')
    await user.type(screen.getByLabelText('Excerpt'), 'A short teaser.')
    await user.type(screen.getByLabelText('Body'), 'Hello world')
    await user.type(screen.getByLabelText('Cover image URL'), 'https://example.com/cover.jpg')
    await user.type(screen.getByLabelText('Meta description'), 'For search engines.')
    await user.clear(screen.getByLabelText('Byline'))
    await user.type(screen.getByLabelText('Byline'), 'Dylan')
    await user.click(screen.getByRole('checkbox', { name: 'Dietary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate).toHaveBeenCalledWith('token-abc', {
      title: 'Best Cheese Ever',
      slug: 'best-cheese-ever',
      excerpt: 'A short teaser.',
      body: 'Hello world',
      cover_image_url: 'https://example.com/cover.jpg',
      meta_description: 'For search engines.',
      author_name: 'Dylan',
      related_sandwich_slugs: [],
      published: false,
      published_at: null,
      category_slugs: ['dietary'],
    })
    expect(toast.success).toHaveBeenCalledWith('Post saved.')
    expect(await screen.findByText('Best Cheese Ever')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
  })

  it('defaults the byline to the site name', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    expect(screen.getByLabelText('Byline')).toHaveValue('Between the Bread')
  })

  it('lists every category as a checkbox, none ticked', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    const group = screen.getByRole('group', { name: 'Categories' })
    expect(within(group).getAllByRole('checkbox').map((box) => (box as HTMLInputElement).checked)).toEqual([false, false, false])
    expect(within(group).getByRole('checkbox', { name: 'Best Pairings' })).toBeInTheDocument()
  })

  it('explains why publishing is disabled until a category is chosen', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    expect(screen.getByRole('checkbox', { name: 'Published' })).toBeDisabled()
    expect(screen.getByText('Choose at least one category to publish this post.')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))

    expect(screen.getByRole('checkbox', { name: 'Published' })).toBeEnabled()
    expect(screen.queryByText('Choose at least one category to publish this post.')).not.toBeInTheDocument()
  })

  it('publishes straight away when no date is chosen', async () => {
    mockCreate.mockResolvedValue(makePost({ id: 'p-new' }))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Published' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const sent = mockCreate.mock.calls[0][1] as Record<string, unknown>
    expect(sent.published).toBe(true)
    expect(sent).not.toHaveProperty('published_at')
  })

  it('schedules a post with the chosen date, read as local time', async () => {
    mockCreate.mockResolvedValue(makePost({ id: 'p-new' }))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))
    await user.click(screen.getByRole('checkbox', { name: 'Published' }))
    fireEvent.change(screen.getByLabelText('Publish date'), { target: { value: '2999-06-01T09:30' } })
    expect(screen.getByText('This post will go live on the date above.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate.mock.calls[0][1]).toMatchObject({
      published: true,
      published_at: new Date(2999, 5, 1, 9, 30).toISOString(),
    })
  })

  it('previews the body as formatted text', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Body'), 'Some **bold** words')
    await user.click(screen.getByRole('button', { name: 'Preview body' }))

    expect(screen.getByText('bold').tagName).toBe('STRONG')
    expect(screen.queryByLabelText('Body')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit body' }))
    expect(screen.getByLabelText('Body')).toHaveValue('Some **bold** words')
  })

  it('requires a title and slug', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Title and slug are required.')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns to the list without saving when cancelled', async () => {
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Never saved')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'New post' })).toBeInTheDocument()
  })

  it('explains when the slug is already used and keeps the editor open', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('conflict'), { code: 'SLUG_TAKEN' }))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('A post with that slug already exists.') })
    expect(screen.getByLabelText('Title')).toHaveValue('Hello')
  })

  it('shows the reason the server gives for invalid input', async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error('bad'), { code: 'INVALID_INPUT', detail: 'That slug is reserved.' }))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('That slug is reserved.') })
  })

  it('shows a general error when saving fails', async () => {
    mockCreate.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await openEditor(user)

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to save post.') })
  })
})

describe('BlogManagementPage editing a post', () => {
  const openEditor = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await renderPage()
    await user.click(screen.getByRole('button', { name: `Edit ${name}` }))
  }

  it('fills the form from the post', async () => {
    const user = userEvent.setup()
    await openEditor(user, 'Summer ideas')

    expect(screen.getByLabelText('Title')).toHaveValue('Summer ideas')
    expect(screen.getByLabelText('Slug')).toHaveValue('summer-ideas')
    expect(screen.getByLabelText('Excerpt')).toHaveValue('Five builds.')
    expect(screen.getByLabelText('Body')).toHaveValue('Some **bold** words.')
    expect(screen.getByRole('checkbox', { name: 'Sandwich Ideas' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Dietary' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Best Pairings' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Published' })).toBeChecked()
    expect(screen.getByLabelText('Publish date')).toHaveValue(toDateTimeLocal('2999-06-01T12:00:00.000Z'))
  })

  it('keeps the slug when the title is changed', async () => {
    const user = userEvent.setup()
    await openEditor(user, 'Summer ideas')

    await user.type(screen.getByLabelText('Title'), ' and more')

    expect(screen.getByLabelText('Slug')).toHaveValue('summer-ideas')
  })

  it('saves the changes to the post by its slug', async () => {
    mockUpdate.mockResolvedValue({ ...draft, title: 'Vegan builds, revised' })
    const user = userEvent.setup()
    await openEditor(user, 'Vegan builds')

    await user.type(screen.getByLabelText('Title'), ', revised')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'vegan-builds', expect.objectContaining({
      title: 'Vegan builds, revised',
      slug: 'vegan-builds',
      published: false,
      category_slugs: [],
    }))
    expect(await screen.findByText('Vegan builds, revised')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Post saved.')
  })

  it('unpublishes a post and clears its categories in the same save', async () => {
    mockUpdate.mockResolvedValue({ ...live, published: false, categories: [] })
    const user = userEvent.setup()
    await openEditor(user, 'Pairings guide')

    await user.click(screen.getByRole('checkbox', { name: 'Published' }))
    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate).toHaveBeenCalledWith('token-abc', 'pairings-guide', expect.objectContaining({
      published: false,
      category_slugs: [],
    }))
  })

  it('explains that a published post needs a category once its last one is unticked', async () => {
    const user = userEvent.setup()
    await openEditor(user, 'Pairings guide')

    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))

    expect(screen.getByText('Choose at least one category to publish this post.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Published' })).toBeEnabled()
  })

  it('does not save a published post that has no category', async () => {
    const user = userEvent.setup()
    await openEditor(user, 'Pairings guide')

    await user.click(screen.getByRole('checkbox', { name: 'Best Pairings' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(toast.error).toHaveBeenCalledWith('Choose at least one category to publish this post.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('does not send a publish date for a published post whose date field is cleared', async () => {
    mockUpdate.mockResolvedValue(live)
    const user = userEvent.setup()
    await openEditor(user, 'Pairings guide')

    fireEvent.change(screen.getByLabelText('Publish date'), { target: { value: '' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate.mock.calls[0][2]).not.toHaveProperty('published_at')
  })
})

const navigateTo = (router: ReturnType<typeof createMemoryRouter>, path: string) =>
  act(async () => { await router.navigate(path) })

const reuben = { name: 'Reuben', slug: 'reuben' }
const cubano = { name: 'Cubano', slug: 'cubano' }

const openNewPost = async (user: ReturnType<typeof userEvent.setup>) => {
  await renderPage()
  await user.click(screen.getByRole('button', { name: 'New post' }))
}

const png = (name = 'diagram.png') => new File(['x'], name, { type: 'image/png' })

describe('BlogManagementPage images', () => {
  it('uploads a picture and inserts it into the body where the cursor is', async () => {
    mockUploadImage.mockResolvedValue('https://cdn.example.com/diagram.png')
    const user = userEvent.setup()
    await openNewPost(user)
    const body = screen.getByLabelText<HTMLTextAreaElement>('Body')
    await user.type(body, 'Hello world')
    body.setSelectionRange(5, 5)

    const file = png()
    await user.upload(screen.getByLabelText('Insert image'), file)

    expect(mockUploadImage).toHaveBeenCalledWith({ bucket: 'blog-images', file })
    await waitFor(() => { expect(body).toHaveValue('Hello![diagram](https://cdn.example.com/diagram.png) world') })
  })

  it('puts the picture at the start of an empty body', async () => {
    mockUploadImage.mockResolvedValue('https://cdn.example.com/diagram.png')
    const user = userEvent.setup()
    await openNewPost(user)

    await user.upload(screen.getByLabelText('Insert image'), png())

    await waitFor(() => { expect(screen.getByLabelText('Body')).toHaveValue('![diagram](https://cdn.example.com/diagram.png)') })
  })

  it('shows the reason when the picture is rejected and leaves the body alone', async () => {
    mockUploadImage.mockRejectedValue(new Error('Images must be 5MB or smaller.'))
    const user = userEvent.setup()
    await openNewPost(user)
    await user.type(screen.getByLabelText('Body'), 'Keep me')

    await user.upload(screen.getByLabelText('Insert image'), png())

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Images must be 5MB or smaller.') })
    expect(screen.getByLabelText('Body')).toHaveValue('Keep me')
  })

  it('cannot insert a picture while the preview is showing', async () => {
    const user = userEvent.setup()
    await openNewPost(user)

    await user.click(screen.getByRole('button', { name: 'Preview body' }))

    expect(screen.getByLabelText('Insert image')).toBeDisabled()
  })

  it('uploads a cover image and fills in its URL with a preview', async () => {
    mockUploadImage.mockResolvedValue('https://cdn.example.com/cover.png')
    const user = userEvent.setup()
    await openNewPost(user)

    await user.upload(screen.getByLabelText('Upload cover image'), png('cover.png'))

    await waitFor(() => { expect(screen.getByLabelText('Cover image URL')).toHaveValue('https://cdn.example.com/cover.png') })
    expect(screen.getByAltText('Cover preview')).toHaveAttribute('src', 'https://cdn.example.com/cover.png')
  })

  it('shows the reason when the cover image is rejected', async () => {
    mockUploadImage.mockRejectedValue(new Error('Please choose a JPEG, PNG, or WebP image.'))
    const user = userEvent.setup()
    await openNewPost(user)

    await user.upload(screen.getByLabelText('Upload cover image'), png('cover.png'))

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Please choose a JPEG, PNG, or WebP image.') })
    expect(screen.getByLabelText('Cover image URL')).toHaveValue('')
  })
})

describe('BlogManagementPage related sandwiches', () => {
  it('searches the encyclopedia and adds the chosen sandwich to the post', async () => {
    mockFetchSandwiches.mockResolvedValue({ items: [reuben, cubano], totalCount: 2 })
    mockCreate.mockResolvedValue(makePost({ id: 'p-new' }))
    const user = userEvent.setup()
    await openNewPost(user)

    await user.type(screen.getByLabelText('Search sandwiches'), 'cu')
    await user.click(await screen.findByRole('button', { name: 'Add Cubano' }))

    expect(mockFetchSandwiches).toHaveBeenCalledWith({ q: 'cu', limit: 8 })
    expect(screen.getByText('Cubano', { selector: 'li span' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Cubano' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockCreate.mock.calls[0][1]).toMatchObject({ related_sandwich_slugs: ['cubano'] })
  })

  it('removes a chosen sandwich again', async () => {
    mockFetchSandwiches.mockResolvedValue({ items: [reuben], totalCount: 1 })
    const user = userEvent.setup()
    await openNewPost(user)

    await user.type(screen.getByLabelText('Search sandwiches'), 'reu')
    await user.click(await screen.findByRole('button', { name: 'Add Reuben' }))
    await user.click(screen.getByRole('button', { name: 'Remove Reuben' }))

    expect(screen.queryByRole('button', { name: 'Remove Reuben' })).not.toBeInTheDocument()
  })

  it('says so when no sandwich matches the search', async () => {
    const user = userEvent.setup()
    await openNewPost(user)

    await user.type(screen.getByLabelText('Search sandwiches'), 'zzz')

    expect(await screen.findByText('No matching sandwiches.')).toBeInTheDocument()
  })

  it('shows an error when the search fails', async () => {
    mockFetchSandwiches.mockRejectedValue(new Error('nope'))
    const user = userEvent.setup()
    await openNewPost(user)

    await user.type(screen.getByLabelText('Search sandwiches'), 'reu')

    await waitFor(() => { expect(toast.error).toHaveBeenCalledWith('Failed to search sandwiches.') })
  })

  it('shows the names of the sandwiches an existing post already links to', async () => {
    mockFetchSandwich.mockImplementation((slug: string) => Promise.resolve(slug === 'reuben' ? reuben : null))
    mockFetchPosts.mockResolvedValue([makePost({ related_sandwich_slugs: ['reuben', 'gone-entry'] })])
    mockUpdate.mockResolvedValue(makePost())
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Vegan builds' }))

    expect(await screen.findByRole('button', { name: 'Remove Reuben' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove gone-entry' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Reuben' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockUpdate.mock.calls[0][2]).toMatchObject({ related_sandwich_slugs: ['gone-entry'] })
  })

  it('stops offering more once ten sandwiches are linked', async () => {
    const ten = Array.from({ length: 10 }, (_value, index) => `sandwich-${String(index)}`)
    mockFetchPosts.mockResolvedValue([makePost({ related_sandwich_slugs: ten })])
    const user = userEvent.setup()
    await renderPage()
    await user.click(screen.getByRole('button', { name: 'Edit Vegan builds' }))

    expect(screen.getByText('You can link up to 10 sandwiches.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Search sandwiches')).not.toBeInTheDocument()
  })
})

describe('BlogManagementPage unsaved changes', () => {
  it('lets you leave freely when nothing has changed', async () => {
    const user = userEvent.setup()
    await openNewPost(user)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'New post' })).toBeInTheDocument()
  })

  it('asks before cancelling when there are unsaved edits, and stays if you decline', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const user = userEvent.setup()
    await openNewPost(user)
    await user.type(screen.getByLabelText('Title'), 'Draft in progress')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?')
    expect(screen.getByLabelText('Title')).toHaveValue('Draft in progress')
  })

  it('asks before following a link elsewhere in the site, and stays if you decline', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const user = userEvent.setup()
    const router = await renderPage()
    await user.click(screen.getByRole('button', { name: 'New post' }))
    await user.type(screen.getByLabelText('Title'), 'Draft in progress')

    await navigateTo(router, '/other')

    expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Leave without saving?')
    expect(screen.getByLabelText('Title')).toHaveValue('Draft in progress')
    expect(screen.queryByText('Other page')).not.toBeInTheDocument()
  })

  it('leaves when you confirm', async () => {
    const user = userEvent.setup()
    const router = await renderPage()
    await user.click(screen.getByRole('button', { name: 'New post' }))
    await user.type(screen.getByLabelText('Title'), 'Draft in progress')

    await navigateTo(router, '/other')

    expect(await screen.findByText('Other page')).toBeInTheDocument()
  })

  it('does not ask when navigating away with no edits', async () => {
    const user = userEvent.setup()
    const router = await renderPage()
    await user.click(screen.getByRole('button', { name: 'New post' }))

    await navigateTo(router, '/other')

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('warns the browser before the tab is closed or reloaded while there are unsaved edits', async () => {
    const user = userEvent.setup()
    await openNewPost(user)
    await user.type(screen.getByLabelText('Title'), 'Draft in progress')

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('does not warn the browser when nothing has changed', async () => {
    const user = userEvent.setup()
    await openNewPost(user)

    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('does not ask after the post has been saved', async () => {
    mockCreate.mockResolvedValue(makePost({ id: 'p-new' }))
    const user = userEvent.setup()
    const router = await renderPage()
    await user.click(screen.getByRole('button', { name: 'New post' }))
    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('button', { name: 'New post' })

    await navigateTo(router, '/other')

    expect(await screen.findByText('Other page')).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()
  })
})
