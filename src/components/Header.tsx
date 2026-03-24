import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Header() {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('mousedown', handleClickOutside) }
  }, [])

  const displayName =
    (user?.user_metadata as { display_name?: string } | undefined)?.display_name ?? user?.email ?? ''

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    void navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-6">
        <Link to="/" className="font-display text-lg font-bold text-neutral-900">
          Between the Bread
        </Link>

        {!loading && user === null && (
          <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-primary">
            Log in
          </Link>
        )}

        {!loading && user !== null && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => { setMenuOpen((prev) => !prev); }}
              aria-label="Account menu"
              className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-primary"
            >
              {displayName}
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
                <Link
                  to="/account/settings"
                  onClick={() => { setMenuOpen(false) }}
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Settings
                </Link>
                <Link
                  to="/account/history"
                  onClick={() => { setMenuOpen(false) }}
                  className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  History
                </Link>
                <button
                  onClick={() => void handleSignOut()}
                  className="block w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
