import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import PageViewTracker from '@/components/PageViewTracker'
import { AuthProvider } from '@/context/AuthContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <PageViewTracker />
      <Outlet />
      <Toaster richColors position="bottom-center" />
    </AuthProvider>
  )
}
