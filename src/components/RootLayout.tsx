import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppShell from '@/components/AppShell'
import PageViewTracker from '@/components/PageViewTracker'
import PasswordRecoveryRedirect from '@/components/PasswordRecoveryRedirect'
import { AuthProvider } from '@/context/AuthContext'
import { AuthPromptProvider } from '@/context/AuthPromptContext'
import { UsernameProvider } from '@/context/UsernameContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthPromptProvider>
        <UsernameProvider>
          <PageViewTracker />
          <PasswordRecoveryRedirect />
          <AppShell>
            <Outlet />
          </AppShell>
          <Toaster richColors position="bottom-center" />
        </UsernameProvider>
      </AuthPromptProvider>
    </AuthProvider>
  )
}
