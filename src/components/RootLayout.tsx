import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import PageViewTracker from '@/components/PageViewTracker'
import PasswordRecoveryRedirect from '@/components/PasswordRecoveryRedirect'
import { AuthProvider } from '@/context/AuthContext'
import { AuthPromptProvider } from '@/context/AuthPromptContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthPromptProvider>
        <PageViewTracker />
        <PasswordRecoveryRedirect />
        <Outlet />
        <Toaster richColors position="bottom-center" />
      </AuthPromptProvider>
    </AuthProvider>
  )
}
