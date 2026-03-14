import type { RouteObject } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import PrivacyPage from '@/pages/PrivacyPage'
import TermsPage from '@/pages/TermsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import SharedSandwich from '@/pages/SharedSandwich'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/s/:hash', element: <SharedSandwich /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
