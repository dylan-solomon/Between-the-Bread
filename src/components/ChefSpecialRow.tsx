import type { Ingredient } from '@/types'

type Props = {
  chefsSpecial: Ingredient[] | null
}

export default function ChefSpecialRow({ chefsSpecial }: Props) {
  if (chefsSpecial === null) return null

  const displayText = chefsSpecial.map((i) => i.name).join(' & ')

  return (
    <div className="flex items-center gap-3 rounded-lg border border-chefs-special bg-chefs-special-light px-4 py-3 text-chefs-special animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="text-xl" aria-hidden="true">👨‍🍳</span>
      <span className="min-w-[80px] text-sm font-semibold">Chef&apos;s Special</span>
      <span className="flex-1 text-sm font-medium text-neutral-800">{displayText}</span>
    </div>
  )
}
