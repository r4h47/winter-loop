import { useEffect, useRef, useState } from 'react'
import { CalendarPlus, Check, Download, ExternalLink } from 'lucide-react'
import type { Day, Depart, Stop } from '../data/trip'
import { buildIcs, dayLinks, download } from '../lib/ics'

export function CalendarMenu({ stops, depart, motel }: { stops: Stop[]; depart: Depart; motel: string }) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 4000)
    return () => clearTimeout(t)
  }, [saved])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    const outside = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    addEventListener('keydown', onKey)
    addEventListener('pointerdown', outside)
    addEventListener('focusin', outside)
    return () => {
      removeEventListener('keydown', onKey)
      removeEventListener('pointerdown', outside)
      removeEventListener('focusin', outside)
    }
  }, [open])

  const days = ([1, 2] as Day[]).map((d) => ({ d, ...dayLinks(stops, depart, motel, d) }))
  return (
    <div className="cal" ref={root}>
      <button ref={button} type="button" className="btn-secondary btn-small" aria-expanded={open} aria-controls="cal-menu" onClick={() => setOpen(!open)}>
        <CalendarPlus size={16} aria-hidden="true" /><span>Add to Calendar</span>
      </button>
      <div id="cal-menu" className="cal-menu" hidden={!open}>
        {([['Google Calendar', 'google'], ['Outlook', 'outlook']] as const).map(([name, key]) => (
          <div className="cal-group" key={key} role="group" aria-label={name}>
            <p translate="no">{name}</p>
            {days.map((x) => <a key={x.d} className="btn-secondary btn-mid" href={x[key]} target="_blank" rel="noreferrer">Day {x.d}<ExternalLink size={16} aria-hidden="true" /><span className="sr"> in {name}, opens in a new tab</span></a>)}
          </div>
        ))}
        <div className="cal-all">
          <button type="button" className="text-btn" onClick={() => { download('winter-loop.ics', buildIcs(stops, depart, motel), 'text/calendar;charset=utf-8'); setSaved(true) }}>
            {saved ? <Check size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{saved ? 'Exported .ics' : 'Export .ics With Every Stop'}
          </button>
          <p className="muted">Apple Calendar and work accounts can open this file.</p>
        </div>
        <span className="sr" role="status">{saved ? 'Calendar file exported' : ''}</span>
      </div>
    </div>
  )
}
