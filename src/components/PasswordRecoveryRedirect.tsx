import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function PasswordRecoveryRedirect() {
  const { passwordRecovery, clearPasswordRecovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (passwordRecovery) {
      clearPasswordRecovery()
      void navigate('/reset-password', { replace: true })
    }
  }, [passwordRecovery, clearPasswordRecovery, navigate])

  return null
}
