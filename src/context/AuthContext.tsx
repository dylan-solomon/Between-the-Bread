import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, Session, Provider } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { captureAccountLoggedOut, resetIdentity } from '@/analytics/events'

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  passwordRecovery: boolean
  clearPasswordRecovery: () => void
  signIn: (identifier: string, password: string) => Promise<User>
  signUp: (email: string, password: string, username?: string) => Promise<User>
  signInWithOAuth: (provider: Provider) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USERNAME_SIGN_IN_FAILED = 'Incorrect username or password.'

const signInWithUsername = async (username: string, password: string): Promise<User> => {
  const response = await fetch(new URL('/api/auth/login', window.location.origin).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = (await response.json().catch(() => ({}))) as {
    data?: { access_token?: string; refresh_token?: string }
    error?: { message?: string }
  }
  const tokens = body.data
  if (!response.ok || tokens?.access_token === undefined || tokens.refresh_token === undefined) {
    throw new Error(body.error?.message ?? USERNAME_SIGN_IN_FAILED)
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  if (error !== null || data.user === null) throw new Error(USERNAME_SIGN_IN_FAILED)
  return data.user
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const clearPasswordRecovery = () => { setPasswordRecovery(false) }

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    void initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
      }
    })

    return () => { subscription.unsubscribe() }
  }, [])

  const signIn = async (identifier: string, password: string): Promise<User> => {
    if (!identifier.includes('@')) return signInWithUsername(identifier, password)
    const { data, error } = await supabase.auth.signInWithPassword({ email: identifier, password })
    if (error) throw error
    return data.user
  }

  const signUp = async (email: string, password: string, username?: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(username === undefined ? {} : { options: { data: { username } } }),
    })
    if (error) throw error
    return data.user as User
  }

  const signInWithOAuth = async (provider: Provider): Promise<void> => {
    await supabase.auth.signInWithOAuth({ provider })
  }

  const signOut = async (): Promise<void> => {
    captureAccountLoggedOut()
    resetIdentity()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, passwordRecovery, clearPasswordRecovery, signIn, signUp, signInWithOAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
