type Props = {
  hasRolled: boolean
  isRolling: boolean
  onClick: () => void
}

export default function RollAllButton({ hasRolled, isRolling, onClick }: Props) {
  const label = hasRolled ? 'Roll Again' : 'Roll the Dice'
  const pulse = !hasRolled && !isRolling

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isRolling}
      className={`w-full rounded-full bg-primary py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${pulse ? 'animate-pulse' : ''}`}
    >
      {label}
    </button>
  )
}
