import { Link } from 'react-router-dom'
import AppShell from '@/components/AppShell'

export default function NotFoundPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[480px] px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-neutral-900">
          This Sandwich Doesn&apos;t Exist (Yet)
        </h1>
        <p className="mt-4 text-neutral-600">
          The page you&apos;re looking for couldn&apos;t be found.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Roll a sandwich instead
        </Link>
      </div>
    </AppShell>
  )
}
