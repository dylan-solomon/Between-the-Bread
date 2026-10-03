import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchOwnUsername, saveUsername as saveUsernameToProfile } from '@/api/usernames'
import UsernamePromptModal from '@/components/UsernamePromptModal'
import { useAuth } from '@/context/AuthContext'

const LATER_KEY = 'btb_username_prompt_later'
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

type UsernameContextValue = {
  username: string | null
  needsUsername: boolean
  askForUsername: () => void
  saveUsername: (username: string) => Promise<void>
}

const UsernameContext = createContext<UsernameContextValue | null>(null)

const readLater = (): boolean => {
  try {
    return window.sessionStorage.getItem(LATER_KEY) === '1'
  } catch {
    return false
  }
}

const rememberLater = (): void => {
  try {
    window.sessionStorage.setItem(LATER_KEY, '1')
  } catch {
    return
  }
}

export const UsernameProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth()
  const { pathname } = useLocation()
  const [loaded, setLoaded] = useState<{ userId: string; username: string | null } | null>(null)
  const [later, setLater] = useState(readLater)
  const [asked, setAsked] = useState(false)

  const userId = user?.id ?? null
  const token = session?.access_token ?? null

  useEffect(() => {
    if (userId === null || token === null) return
    let cancelled = false
    fetchOwnUsername(token)
      .then((username) => { if (!cancelled) setLoaded({ userId, username }) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [userId, token])

  const current = loaded !== null && loaded.userId === userId ? loaded : null
  const username = current?.username ?? null
  const needsUsername = current !== null && current.username === null

  const askForUsername = useCallback(() => { setAsked(true) }, [])

  const putOff = useCallback(() => {
    rememberLater()
    setLater(true)
    setAsked(false)
  }, [])

  const saveUsername = useCallback(async (name: string) => {
    if (userId === null || token === null) return
    await saveUsernameToProfile({ token, username: name })
    setLoaded({ userId, username: name })
    setAsked(false)
    toast.success('Username saved.')
  }, [userId, token])

  const showPrompt = needsUsername && (asked || (!later && !AUTH_PAGES.includes(pathname)))

  const value = useMemo(
    () => ({ username, needsUsername, askForUsername, saveUsername }),
    [username, needsUsername, askForUsername, saveUsername],
  )

  return (
    <UsernameContext.Provider value={value}>
      {children}
      {showPrompt && <UsernamePromptModal onSave={saveUsername} onLater={putOff} />}
    </UsernameContext.Provider>
  )
}

export const useUsername = (): UsernameContextValue => {
  const context = useContext(UsernameContext)
  if (context === null) throw new Error('useUsername must be used within a UsernameProvider')
  return context
}
