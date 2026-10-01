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
const SandwichIndex = lazy(() => import('@/pages/SandwichIndex'))
const BlogIndex = lazy(() => import('@/pages/BlogIndex'))
const BlogCategory = lazy(() => import('@/pages/BlogCategory'))
const SandwichDetail = lazy(() => import('@/pages/SandwichDetail'))
const SharedSandwich = lazy(() => import('@/pages/SharedSandwich'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const IngredientsAdminPage = lazy(() => import('@/pages/admin/IngredientsPage'))
const DatabaseManagementPage = lazy(() => import('@/pages/admin/DatabaseManagementPage'))
const BlogManagementPage = lazy(() => import('@/pages/admin/BlogManagementPage'))
const BlogCategoriesPage = lazy(() => import('@/pages/admin/BlogCategoriesPage'))
const CompatMatrixPage = lazy(() => import('@/pages/admin/CompatMatrixPage'))
const ModerationPage = lazy(() => import('@/pages/admin/ModerationPage'))
const ConfigPage = lazy(() => import('@/pages/admin/ConfigPage'))

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
      { path: '/sandwiches', element: withSuspense(SandwichIndex) },
      { path: '/sandwiches/:slug', element: withSuspense(SandwichDetail) },
      { path: '/blog', element: withSuspense(BlogIndex) },
      { path: '/blog/category/:slug', element: withSuspense(BlogCategory) },
      { path: '/s/:hash', element: withSuspense(SharedSandwich) },
      {
        path: '/admin',
        element: withSuspense(AdminLayout),
        children: [
          { index: true, element: withSuspense(DashboardPage) },
          { path: 'ingredients', element: withSuspense(IngredientsAdminPage) },
          { path: 'database', element: withSuspense(DatabaseManagementPage) },
          { path: 'blog', element: withSuspense(BlogManagementPage) },
          { path: 'blog/categories', element: withSuspense(BlogCategoriesPage) },
          { path: 'compat-matrix', element: withSuspense(CompatMatrixPage) },
          { path: 'moderation', element: withSuspense(ModerationPage) },
          { path: 'config', element: withSuspense(ConfigPage) },
        ],
      },
      { path: '*', element: withSuspense(NotFoundPage) },
    ],
  },
]
