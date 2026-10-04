import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'

const { mockUseAuth, mockFetchOwn, mockSave, mockCheck } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockFetchOwn: vi.fn(),
  mockSave: vi.fn(),
  mockCheck: vi.fn(),
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: mockUseAuth }))
vi.mock('@/api/usernames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/usernames')>()),
  fetchOwnUsername: mockFetchOwn,
  saveUsername: mockSave,
  checkUsername: mockCheck,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { UsernameProvider, useUsername } from '@/context/UsernameContext'
import { accessibilityProblems } from '@/test/accessibility'

const signedIn = () => {
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' }, session: { access_token: 'token-abc' }, loading: false })
}

function Consumer() {
  const { username, needsUsername, askForUsername } = useUsername()
  return (
    <div>
      <p data-testid="username">{username ?? 'none'}</p>
      <p data-testid="needs">{String(needsUsername)}</p>
      <button type="button" onClick={askForUsername}>Ask</button>
    </div>
  )
}

const renderAt = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UsernameProvider>
        <Consumer />
      </UsernameProvider>
    </MemoryRouter>,
  )

const dialog = () => screen.queryByRole('dialog', { name: 'Pick a username' })

beforeEach(() => {
  vi.resetAllMocks()
  window.sessionStorage.clear()
  mockUseAuth.mockReturnValue({ user: null, session: null, loading: false })
  mockFetchOwn.mockResolvedValue(null)
  mockSave.mockResolvedValue(undefined)
  mockCheck.mockResolvedValue('available')
})

describe('UsernameProvider when signed out', () => {
  it('never asks for a username', () => {
    renderAt()

    expect(dialog()).not.toBeInTheDocument()
    expect(screen.getByTestId('needs')).toHaveTextContent('false')
    expect(mockFetchOwn).not.toHaveBeenCalled()
  })
})

describe('UsernameProvider for someone who has a username', () => {
  it('shares it without asking for one', async () => {
    signedIn()
    mockFetchOwn.mockResolvedValue('sandwich_fan')

    renderAt()

    await waitFor(() => { expect(screen.getByTestId('username')).toHaveTextContent('sandwich_fan') })
    expect(mockFetchOwn).toHaveBeenCalledWith('token-abc')
    expect(screen.getByTestId('needs')).toHaveTextContent('false')
    expect(dialog()).not.toBeInTheDocument()
  })
})

describe('UsernameProvider for someone without a username', () => {
  it('asks them to pick one and explains where it appears', async () => {
    signedIn()

    renderAt()

    expect(await screen.findByRole('dialog', { name: 'Pick a username' })).toBeInTheDocument()
    expect(screen.getByText(/appears on your comments and on community sandwiches you're the first to make/)).toBeInTheDocument()
    expect(screen.getByTestId('needs')).toHaveTextContent('true')
  })

  it('saves the chosen username and stops asking', async () => {
    signedIn()
    const user = userEvent.setup()
    renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })

    await user.type(screen.getByLabelText('Username'), 'sandwich_fan')
    await screen.findByText('Available!')
    await user.click(screen.getByRole('button', { name: 'Save username' }))

    expect(mockSave).toHaveBeenCalledWith({ token: 'token-abc', username: 'sandwich_fan' })
    await waitFor(() => { expect(dialog()).not.toBeInTheDocument() })
    expect(screen.getByTestId('username')).toHaveTextContent('sandwich_fan')
    expect(screen.getByTestId('needs')).toHaveTextContent('false')
    expect(toast.success).toHaveBeenCalledWith('Username saved.')
  })

  it('will not save a name that is taken', async () => {
    signedIn()
    mockCheck.mockResolvedValue('taken')
    const user = userEvent.setup()
    renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })

    await user.type(screen.getByLabelText('Username'), 'taken_name')
    await screen.findByText('That username is already taken.')

    expect(screen.getByRole('button', { name: 'Save username' })).toBeDisabled()
  })

  it('shows why saving failed and stays open', async () => {
    signedIn()
    mockSave.mockRejectedValue(new Error('That username is already taken.'))
    const user = userEvent.setup()
    renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })

    await user.type(screen.getByLabelText('Username'), 'sandwich_fan')
    await screen.findByText('Available!')
    await user.click(screen.getByRole('button', { name: 'Save username' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That username is already taken.')
    expect(dialog()).toBeInTheDocument()
  })

  it('can be put off until the next visit', async () => {
    signedIn()
    const user = userEvent.setup()
    const { unmount } = renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })

    await user.click(screen.getByRole('button', { name: 'Later' }))

    expect(dialog()).not.toBeInTheDocument()
    unmount()
    renderAt()
    await waitFor(() => { expect(mockFetchOwn).toHaveBeenCalledTimes(2) })
    expect(dialog()).not.toBeInTheDocument()
  })

  it('asks again when the person does something that needs a username', async () => {
    signedIn()
    const user = userEvent.setup()
    renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })
    await user.click(screen.getByRole('button', { name: 'Later' }))

    await user.click(screen.getByRole('button', { name: 'Ask' }))

    expect(dialog()).toBeInTheDocument()
  })

  it.each(['/login', '/signup', '/forgot-password', '/reset-password'])('does not interrupt the %s page', async (path) => {
    signedIn()

    renderAt(path)

    await waitFor(() => { expect(screen.getByTestId('needs')).toHaveTextContent('true') })
    expect(dialog()).not.toBeInTheDocument()
  })

  it('keeps working when the session storage cannot be used', async () => {
    signedIn()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const user = userEvent.setup()
    renderAt()

    await screen.findByRole('dialog', { name: 'Pick a username' })
    await user.click(screen.getByRole('button', { name: 'Later' }))

    expect(dialog()).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })
})

describe('UsernameProvider when the profile cannot be loaded', () => {
  it('does not ask for a username', async () => {
    signedIn()
    mockFetchOwn.mockRejectedValue(new Error('offline'))

    renderAt()

    await act(async () => { await Promise.resolve() })
    expect(dialog()).not.toBeInTheDocument()
    expect(screen.getByTestId('needs')).toHaveTextContent('false')
  })
})

describe('accessibility', () => {
  it('has no accessibility problems', async () => {
    signedIn()
    renderAt()
    await screen.findByRole('dialog', { name: 'Pick a username' })

    expect(await accessibilityProblems(document.body)).toEqual([])
  })
})
