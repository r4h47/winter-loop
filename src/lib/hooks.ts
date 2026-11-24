import { useCallback, useEffect, useState } from 'react'

export function useStored<T>(key: string, initial: T, valid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      const parsed: unknown = raw ? JSON.parse(raw) : null
      return valid(parsed) ? parsed : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be blocked; the page still works for this visit.
    }
  }, [key, value])
  return [value, setValue] as const
}

export type CopyState = 'idle' | 'pending' | 'done' | 'error'
export function useCopy() {
  const [state, setState] = useState<CopyState>('idle')
  useEffect(() => {
    if (state !== 'done' && state !== 'error') return
    const t = setTimeout(() => setState('idle'), 4000)
    return () => clearTimeout(t)
  }, [state])
  const copy = useCallback(async (text: string) => {
    setState('pending')
    try {
      await navigator.clipboard.writeText(text)
      setState('done')
    } catch {
      setState('error')
    }
  }, [])
  return { state, copy }
}

export const scrollToId = (id: string) => {
  const el = document.getElementById(id)
  if (!el) return
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}
