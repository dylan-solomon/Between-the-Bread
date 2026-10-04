import { SANDWICH_CONTAINER_CLASSES, sandwichLayers } from '@/utils/sandwichLayers'
import type { LayerSize, VisualComposition } from '@/utils/sandwichLayers'

export type { VisualComposition } from '@/utils/sandwichLayers'

type Props = {
  composition: VisualComposition | null
  size?: LayerSize
}

export default function SandwichVisual({ composition, size = 'regular' }: Props) {
  if (composition === null) {
    return (
      <div className="flex h-48 overflow-hidden items-center justify-center">
        <p className="font-display italic text-neutral-400">
          Roll the dice to build your sandwich…
        </p>
      </div>
    )
  }

  return (
    <div className={SANDWICH_CONTAINER_CLASSES[size]}>
      {sandwichLayers({ composition, size, animate: size === 'regular' }).map((layer) => (
        <div key={layer.key} role="img" aria-label={layer.label} className={layer.className} />
      ))}
    </div>
  )
}
