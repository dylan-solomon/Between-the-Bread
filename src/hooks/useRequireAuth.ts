import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

type RequireAuthResult = {
  loading: boolean
  authenticated: boolean
}

export const useRequireAuth = (): RequireAuthResult => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && user === null) {
      const currentPath = location.pathname + location.search
      void navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, { replace: true })
    }
  }, [loading, user, navigate, location.pathname, location.search])

  return {
    loading,
    authenticated: user !== null,
  }
}
