type Props = {
  isActive: boolean
  onToggle: (next: boolean) => void
}

export default function SmartModeToggle({ isActive, onToggle }: Props) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => { onToggle(!isActive) }}
      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary text-white'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
      }`}
    >
      Smart Mode
    </button>
  )
}
