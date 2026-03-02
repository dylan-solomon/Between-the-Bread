import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[480px] items-center justify-between px-4">
        <Link to="/" className="font-display text-lg font-bold text-neutral-900">
          Between the Bread
        </Link>
        <Link to="/login" className="text-sm font-medium text-neutral-600 hover:text-primary">
          Log in
        </Link>
      </div>
    </header>
  )
}
