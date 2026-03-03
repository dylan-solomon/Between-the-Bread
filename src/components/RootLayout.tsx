import { Outlet } from 'react-router-dom'
import PageViewTracker from '@/components/PageViewTracker'

export default function RootLayout() {
  return (
    <>
      <PageViewTracker />
      <Outlet />
    </>
  )
}
