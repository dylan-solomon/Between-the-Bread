import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import PageViewTracker from '@/components/PageViewTracker'

export default function RootLayout() {
  return (
    <>
      <PageViewTracker />
      <Outlet />
      <Toaster richColors position="bottom-center" />
    </>
  )
}
