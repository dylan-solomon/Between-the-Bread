type Props = {
  hasRolled: boolean
  isRolling: boolean
  disabled?: boolean
  onClick: () => void
}

export default function RollAllButton({ hasRolled, isRolling, disabled = false, onClick }: Props) {
  const label = hasRolled ? 'Roll Again' : 'Roll the Dice'
  const pulse = !hasRolled && !isRolling && !disabled

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRolling || disabled}
      className={`w-full rounded-full bg-primary py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${pulse ? 'animate-pulse' : ''}`}
    >
      {label}
    </button>
  )
}
