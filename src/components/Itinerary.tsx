import { useRef, type KeyboardEvent } from 'react'
import { Camera, Car, ExternalLink, MapPin, Ticket } from 'lucide-react'
import { blocks, departures, duration, legInfo, mapsUrl, type Block, type Day, type Depart, type Stop } from '../data/trip'
import { Photo } from './Photo'

type Props = {
  stops: Stop[]
  day: Day
  setDay: (d: Day) => void
  block: Block | 'All'
  setBlock: (b: Block | 'All') => void
  depart: Depart
  detour: boolean
  setDetour: (v: boolean) => void
  tradeoff: string
  selected: string
  onShowMap: (id: string) => void
}

export function Itinerary({ stops, day, setDay, block, setBlock, depart, detour, setDetour, tradeoff, selected, onShowMap }: Props) {
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent) => {
    const next = e.key === 'ArrowRight' || e.key === 'End' ? 2 : e.key === 'ArrowLeft' || e.key === 'Home' ? 1 : null
    if (!next) return
    e.preventDefault()
    setDay(next)
    tabs.current[next - 1]?.focus()
  }
  const list = stops.filter((s) => s.day === day)
  const shown = blocks.filter((b) => block === 'All' || b === block)

  return (
    <section id="itinerary" className="section" aria-labelledby="itinerary-h" tabIndex={-1}>
      <div className="wrap">
        <h2 id="itinerary-h">Day-by-Day Itinerary</h2>
        <div className="toolbar">
          <div role="tablist" aria-label="Trip day" className="tabs" onKeyDown={onKey}>
            {([1, 2] as Day[]).map((d) => (
              <button key={d} ref={(el) => { tabs.current[d - 1] = el }} type="button" role="tab" id={`tab-${d}`} aria-selected={day === d} aria-controls="day-panel" tabIndex={day === d ? 0 : -1} onClick={() => setDay(d)}>
                <b>Day {d}</b>
                <span className="num">{d === 1 ? departures[depart].start : departures[depart].end}</span>
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Filter by time of day">
            {(['All', ...blocks] as const).map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={block === b} onClick={() => setBlock(b)}>{b === 'All' ? 'All Day' : b}</button>
            ))}
          </div>
        </div>
        <div id="day-panel" role="tabpanel" aria-labelledby={`tab-${day}`} tabIndex={0} className="day">
          {day === 2 && (
            <div className="detour">
            <label className="check">
              <input type="checkbox" checked={detour} onChange={(e) => setDetour(e.target.checked)} name="detour" />
              <span>Include the Saratoga Springs detour</span>
            </label>
            <p className="muted num">{tradeoff}</p>
            </div>
          )}
          {shown.map((b) => {
            const items = list.filter((s) => s.block === b)
            if (!items.length) return null
            return (
              <div className="block" key={b}>
                <h3>{b}</h3>
                <ol>{items.map((s) => <StopRow key={s.id} stop={s} on={selected === s.id} onShowMap={onShowMap} />)}</ol>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StopRow({ stop: s, on, onShowMap }: { stop: Stop; on: boolean; onShowMap: (id: string) => void }) {
  const info = s.leg && legInfo(s.leg)
  return (
    <li className={`stop${s.photo ? ' has-photo' : ''}`} id={`stop-${s.id}`} tabIndex={-1} data-on={on || undefined}>
      <time className="num stop-time">{s.time.replace(' ', ' ')}</time>
      <div className="stop-main">
        {s.leg && info && (
          <p className="leg">
            <Car size={16} aria-hidden="true" />
            <span><b>{s.leg.label}</b>, {s.leg.road}. <span className="num">{Math.round(info.miles)}&nbsp;mi, {s.leg.plan.replaceAll(' ', ' ')} planned; allow {duration(info.minutes)}.</span></span>
          </p>
        )}
        <h4>{s.title}<em className="badge status num">{s.status}</em>{s.optional && <em className="badge">Optional</em>}</h4>
        <p className="stop-text">{s.text}</p>
        {(s.booking || s.tip) && (
          <dl className="notes">
            {s.booking && <div><dt><Ticket size={16} aria-hidden="true" /><span>Before You Go</span></dt><dd>{s.booking}</dd></div>}
            {s.tip && <div><dt><Camera size={16} aria-hidden="true" /><span>Local Tip</span></dt><dd>{s.tip}</dd></div>}
          </dl>
        )}
        <p className="stop-links">
          <button type="button" className="text-btn" onClick={() => onShowMap(s.id)}><MapPin size={16} aria-hidden="true" />Show on Map<span className="sr">: {s.title}</span></button>
          <a className="text-btn" href={mapsUrl(s.query)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Google Maps<span className="sr">: {s.title}, opens in a new tab</span></a>
          {s.links?.map(([l, u]) => <a key={u} className="text-btn" href={u} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />{l}<span className="sr">, opens in a new tab</span></a>)}
        </p>
      </div>
      {s.photo && <Photo name={s.photo.name} alt={s.photo.alt} sizes="(min-width: 1128px) 340px, (min-width: 744px) 220px, calc(100vw - 48px)" className="stop-photo" />}
    </li>
  )
}
