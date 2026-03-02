import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { label: 'Generator', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
] as const

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 py-8">
      <div className="px-6">
        <p className="font-display text-sm font-bold text-neutral-900">Between the Bread</p>
        <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={label} to={to} className="text-sm text-neutral-600 hover:text-primary">
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-xs text-neutral-400">
          © 2026 Between the Bread. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
