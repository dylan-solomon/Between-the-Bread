import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router-dom'
import RootLayout from '@/components/RootLayout'
import HomePage from '@/pages/HomePage'

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    HydrateFallback: () => null,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/login', lazy: page(() => import('@/pages/LoginPage')) },
      { path: '/signup', lazy: page(() => import('@/pages/SignupPage')) },
      { path: '/forgot-password', lazy: page(() => import('@/pages/ForgotPasswordPage')) },
      { path: '/reset-password', lazy: page(() => import('@/pages/ResetPasswordPage')) },
      { path: '/about', lazy: page(() => import('@/pages/AboutPage')) },
      { path: '/privacy', lazy: page(() => import('@/pages/PrivacyPage')) },
      { path: '/terms', lazy: page(() => import('@/pages/TermsPage')) },
      { path: '/account/settings', lazy: page(() => import('@/pages/SettingsPage')) },
      { path: '/account/history', lazy: page(() => import('@/pages/HistoryPage')) },
      { path: '/sandwiches', lazy: page(() => import('@/pages/SandwichIndex')) },
      { path: '/sandwiches/:slug', lazy: page(() => import('@/pages/SandwichDetail')) },
      { path: '/blog', lazy: page(() => import('@/pages/BlogIndex')) },
      { path: '/blog/category/:slug', lazy: page(() => import('@/pages/BlogCategory')) },
      { path: '/blog/:slug', lazy: page(() => import('@/pages/BlogPost')) },
      { path: '/s/:hash', lazy: page(() => import('@/pages/SharedSandwich')) },
      { path: '/community', lazy: page(() => import('@/pages/CommunityIndex')) },
      { path: '/u/:username', lazy: page(() => import('@/pages/ProfilePage')) },
      {
        path: '/admin',
        lazy: page(() => import('@/pages/admin/AdminLayout')),
        children: [
          { index: true, lazy: page(() => import('@/pages/admin/DashboardPage')) },
          { path: 'ingredients', lazy: page(() => import('@/pages/admin/IngredientsPage')) },
          { path: 'database', lazy: page(() => import('@/pages/admin/DatabaseManagementPage')) },
          { path: 'blog', lazy: page(() => import('@/pages/admin/BlogManagementPage')) },
          { path: 'blog/categories', lazy: page(() => import('@/pages/admin/BlogCategoriesPage')) },
          { path: 'compat-matrix', lazy: page(() => import('@/pages/admin/CompatMatrixPage')) },
          { path: 'moderation', lazy: page(() => import('@/pages/admin/ModerationPage')) },
          { path: 'config', lazy: page(() => import('@/pages/admin/ConfigPage')) },
        ],
      },
      { path: '*', lazy: page(() => import('@/pages/NotFoundPage')) },
    ],
  },
]
