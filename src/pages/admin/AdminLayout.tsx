import { NavLink, Outlet } from 'react-router-dom'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/ingredients', label: 'Ingredients', end: false },
  { to: '/admin/compat-matrix', label: 'Compatibility', end: false },
  { to: '/admin/moderation', label: 'Moderation', end: false },
  { to: '/admin/config', label: 'Config', end: false },
]

export default function AdminLayout() {
  const { loading, authorized } = useRequireAdmin()

  if (loading || !authorized) return null

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 shrink-0 border-r border-neutral-200 bg-neutral-50 p-4">
        <p className="mb-4 font-display text-sm font-bold text-neutral-900">Admin</p>
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-1.5 text-sm ${
                    isActive ? 'bg-primary text-white' : 'text-neutral-700 hover:bg-neutral-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
