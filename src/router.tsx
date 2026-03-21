import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'
import HomePage from '@/pages/HomePage'

const AboutPage = lazy(() => import('@/pages/AboutPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const SharedSandwich = lazy(() => import('@/pages/SharedSandwich'))

const withSuspense = (Component: React.ComponentType) => (
  <Suspense>
    <Component />
  </Suspense>
)

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: withSuspense(AboutPage) },
      { path: '/privacy', element: withSuspense(PrivacyPage) },
      { path: '/terms', element: withSuspense(TermsPage) },
      { path: '/s/:hash', element: withSuspense(SharedSandwich) },
      { path: '*', element: withSuspense(NotFoundPage) },
    ],
  },
]
