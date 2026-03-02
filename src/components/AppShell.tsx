import type { ReactNode } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type Props = {
  children: ReactNode
}

export default function AppShell({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
