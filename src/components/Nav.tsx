import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, LoaderCircle, Menu, Share2, X } from 'lucide-react'
import { useCopy } from '../lib/hooks'

const links = [['itinerary', 'Itinerary'], ['map', 'Map'], ['stays', 'Stays'], ['packing', 'Packing'], ['costs', 'Costs']] as const

export function Nav({ calendar, link }: { calendar: ReactNode; link: () => string }) {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const toggle = useRef<HTMLButtonElement>(null)
  const { state, copy } = useCopy()

  useEffect(() => {
    const seen = new Set<string>()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target.id)
        else seen.delete(e.target.id)
      }
      setCurrent([...links].reverse().find(([id]) => seen.has(id))?.[0] ?? '')
    }, { rootMargin: '-35% 0px -60% 0px' })
    for (const [id] of links) {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggle.current?.focus()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open])

  const items = (onClick?: () => void) =>
    links.map(([id, label]) => (
      <li key={id}>
        <a href={`#${id}`} aria-current={current === id ? 'location' : undefined} onClick={onClick}>{label}</a>
      </li>
    ))

  return (
    <header className="nav">
      <div className="wrap nav-row">
        <a className="wordmark" href="#top" translate="no">
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M27 21 8 24 5 15l5-9 8 1 2 8 7 6Z" />
          </svg>
          Winter Loop
        </a>
        <nav aria-label="Sections" className="nav-links"><ul>{items()}</ul></nav>
        <div className="nav-actions">
          {calendar}
          <button type="button" className="btn-secondary btn-small" disabled={state === 'pending'} onClick={() => copy(link())}>
            {state === 'pending' ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : state === 'done' ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
            <span>{state === 'pending' ? 'Copying…' : state === 'done' ? 'Link Copied' : state === 'error' ? 'Copy Failed' : 'Share Trip'}</span>
          </button>
          <button ref={toggle} type="button" className="icon-btn nav-toggle" aria-expanded={open} aria-controls="menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
        <span className="sr" role="status">{state === 'done' ? 'Group link copied, with names and costs inside' : state === 'error' ? 'Could not copy. Copy the address from your browser instead.' : ''}</span>
      </div>
      <nav id="menu" aria-label="Sections, mobile" className="nav-sheet" hidden={!open}><ul className="wrap">{items(() => setOpen(false))}</ul></nav>
    </header>
  )
}
