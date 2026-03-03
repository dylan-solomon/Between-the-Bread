import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { capturePageView } from '@/analytics/events'

export default function PageViewTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    capturePageView(pathname)
  }, [pathname])
  return null
}
