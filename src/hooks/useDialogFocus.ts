import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const focusablesIn = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE))

const focusTarget = (container: HTMLElement, { last }: { last: boolean }): HTMLElement => {
  const focusables = focusablesIn(container)
  return (last ? focusables.at(-1) : focusables.at(0)) ?? container
}

const shouldWrap = (container: HTMLElement, event: KeyboardEvent): boolean => {
  const focusables = focusablesIn(container)
  const active = document.activeElement
  if (active === null || !container.contains(active) || focusables.length === 0) return true
  return event.shiftKey ? active === focusables[0] || active === container : active === focusables.at(-1)
}

export function useDialogFocus<T extends HTMLElement>(): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const container = ref.current
    if (container === null) return
    const opener = document.activeElement
    if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1')
    if (!container.contains(document.activeElement)) focusTarget(container, { last: false }).focus()

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !shouldWrap(container, event)) return
      event.preventDefault()
      focusTarget(container, { last: event.shiftKey }).focus()
    }
    document.addEventListener('keydown', keepFocusInside)

    return () => {
      document.removeEventListener('keydown', keepFocusInside)
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  return ref
}
