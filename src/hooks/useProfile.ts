import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { DietaryTag } from '@/types'

export type UserProfile = {
  display_name: string | null
  dietary_filters: DietaryTag[]
  smart_mode_default: boolean
  double_protein: boolean
  double_cheese: boolean
  cost_context: 'retail' | 'restaurant'
}

type UseProfileResult = {
  profile: UserProfile | null
  loading: boolean
}

export const useProfile = (): UseProfileResult => {
  const { user, session, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (authLoading || user === null || session === null) return

    setFetching(true)

    const fetchProfile = async () => {
      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const json = await res.json() as { data: { profile: UserProfile } }
        setProfile(json.data.profile)
      }

      setFetching(false)
    }

    void fetchProfile()
  }, [authLoading, user, session])

  return {
    profile,
    loading: authLoading || fetching,
  }
}
