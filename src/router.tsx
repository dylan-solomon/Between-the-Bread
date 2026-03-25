import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'
import HomePage from '@/pages/HomePage'

const AboutPage = lazy(() => import('@/pages/AboutPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const TermsPage = lazy(() => import('@/pages/TermsPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SignupPage = lazy(() => import('@/pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
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
      { path: '/login', element: withSuspense(LoginPage) },
      { path: '/signup', element: withSuspense(SignupPage) },
      { path: '/forgot-password', element: withSuspense(ForgotPasswordPage) },
      { path: '/reset-password', element: withSuspense(ResetPasswordPage) },
      { path: '/about', element: withSuspense(AboutPage) },
      { path: '/privacy', element: withSuspense(PrivacyPage) },
      { path: '/terms', element: withSuspense(TermsPage) },
      { path: '/account/settings', element: withSuspense(SettingsPage) },
      { path: '/account/history', element: withSuspense(HistoryPage) },
      { path: '/s/:hash', element: withSuspense(SharedSandwich) },
      { path: '*', element: withSuspense(NotFoundPage) },
    ],
  },
]
