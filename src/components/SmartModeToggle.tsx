type Props = {
  isActive: boolean
  onToggle: (next: boolean) => void
}

export default function SmartModeToggle({ isActive, onToggle }: Props) {
  return (
    <div className="relative group inline-flex">
      <button
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-describedby="smart-mode-tooltip"
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

      <div
        id="smart-mode-tooltip"
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2.5 w-56 -translate-x-1/2 rounded-xl bg-neutral-800 px-3 py-2 text-center text-xs leading-relaxed text-neutral-100 opacity-0 transition-opacity group-hover:opacity-100"
      >
        Weighs each roll toward ingredients that pair well with your current picks.
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
      </div>
    </div>
  )
}
