import { useState, useEffect } from 'react'
import type { Ingredient } from '@/types'

const ROLL_INTERVAL_MS = 80

const toLabel = (selection: Ingredient[]): string =>
  selection.length === 0 ? '—' : selection.map((i) => i.name).join(' & ')

const pickRandom = (pool: Ingredient[]): string =>
  pool.length === 0 ? '—' : (pool[Math.floor(Math.random() * pool.length)]?.name ?? '—')

type Options = {
  isRolling: boolean
  selection: Ingredient[]
  pool: Ingredient[]
}

export const useCyclingText = ({ isRolling, selection, pool }: Options): string => {
  const [displayText, setDisplayText] = useState(() => toLabel(selection))

  useEffect(() => {
    if (!isRolling) {
      setDisplayText(toLabel(selection))
      return
    }
    setDisplayText(pickRandom(pool))
    const interval = setInterval(() => {
      setDisplayText(pickRandom(pool))
    }, ROLL_INTERVAL_MS)
    return () => { clearInterval(interval) }
  }, [isRolling, selection, pool])

  return displayText
}
