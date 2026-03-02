import { Dice5, Lock, Unlock, Share2, Star, Search, Menu, X } from 'lucide-react'

const ICONS = [
  { name: 'Dice5', Icon: Dice5 },
  { name: 'Lock', Icon: Lock },
  { name: 'Unlock', Icon: Unlock },
  { name: 'Share2', Icon: Share2 },
  { name: 'Star', Icon: Star },
  { name: 'Search', Icon: Search },
  { name: 'Menu', Icon: Menu },
  { name: 'X', Icon: X },
] as const

export default function App() {
  return (
    <div style={{ display: 'flex', gap: 16, padding: 24 }}>
      {ICONS.map(({ name, Icon }) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <Icon size={24} />
          <span style={{ fontSize: 12 }}>{name}</span>
        </div>
      ))}
    </div>
  )
}
