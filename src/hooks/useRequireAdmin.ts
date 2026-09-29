import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'

type RequireAdminResult = {
  loading: boolean
  authorized: boolean
}

export const useRequireAdmin = (): RequireAdminResult => {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const navigate = useNavigate()
  const location = useLocation()

  const loading = authLoading || profileLoading

  useEffect(() => {
    if (loading) return

    if (user === null) {
      const currentPath = location.pathname + location.search
      void navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true })
      return
    }

    if (profile !== null && !profile.is_admin) {
      void navigate('/', { replace: true })
    }
  }, [loading, user, profile, navigate, location.pathname, location.search])

  return {
    loading,
    authorized: user !== null && profile !== null && profile.is_admin,
  }
}
