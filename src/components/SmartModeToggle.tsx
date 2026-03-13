type Props = {
  isActive: boolean
  onToggle: (next: boolean) => void
}

export default function SmartModeToggle({ isActive, onToggle }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      title="Weights your rolls by flavor compatibility — ingredients that pair well with your current picks appear more often"
      onClick={() => { onToggle(!isActive) }}
      className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition-colors"
    >
      <span>Smart Mode</span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          isActive ? 'bg-primary' : 'bg-neutral-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  )
}
