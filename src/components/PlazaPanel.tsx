import { useEffect, useState } from 'react'
import { ExternalLink, Fuel, LoaderCircle, LocateFixed, LocateOff, Navigation } from 'lucide-react'
import type { Live } from '../lib/location'
import { miles, plazaNav, wait, type Ahead, type Track } from '../lib/plazas'

type Props = {
  track: Track
  setTrack: (t: Track) => void
  list: Ahead[]
  next: Ahead | null
  off: number | null
  onRoute: boolean
  live: Live
  start: () => void
  stop: () => void
  picked: string
  onPick: (id: string) => void
}
const tracks: [Track, string][] = [['day1', 'Day 1'], ['day2', 'Day 2'], ['storm', 'Storm Route']]

export function PlazaPanel({ track, setTrack, list, next, off, onRoute, live, start, stop, picked, onPick }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])
  const stale = live.kind === 'on' && now - live.time > 60_000

  return (
    <div className="plaza-panel">
      <div className="chips" role="group" aria-label="Drive to search">
        {tracks.map(([t, l]) => <button key={t} type="button" className="chip" aria-pressed={track === t} onClick={() => setTrack(t)}>{l}</button>)}
      </div>
      {live.kind === 'on' ? (
        <button type="button" className="btn-secondary" onClick={stop}><LocateOff size={16} aria-hidden="true" />Stop Live Location</button>
      ) : (
        <button type="button" className="btn-primary" disabled={live.kind === 'pending'} onClick={start}>
          {live.kind === 'pending' ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
          {live.kind === 'pending' ? 'Finding You…' : live.kind === 'error' ? 'Try Again' : 'Use Live Location'}
        </button>
      )}
      {live.kind === 'error' && <p className="error" role="alert">{live.text}</p>}
      {live.kind === 'on' && stale && <p className="muted" role="status">Position not updated for over a minute. Distances may be old.</p>}
      {live.kind === 'on' && (
        <div className="plaza-next" role="status">
          {!onRoute ? (
            <p>You are {miles(off ?? 0)} from this route. Distances start once you are on it.</p>
          ) : next ? (
            <>
              <p className="muted">Next stop ahead</p>
              <h3>{next.name}</h3>
              <p className="num"><b>{miles(next.gap)}</b>, about {wait(next.wait)}</p>
              <a className="btn-primary" href={plazaNav(next)} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" />Navigate<span className="sr"> to {next.name}, opens in a new tab</span></a>
            </>
          ) : <p>No more listed stops ahead on this drive.</p>}
        </div>
      )}
      <ol className="plaza-list num" aria-label="Service plazas in driving order">
        {list.map((p) => (
          <li key={p.id} data-state={p.state} data-on={picked === p.id || undefined}>
            <button type="button" aria-pressed={picked === p.id} onClick={() => onPick(p.id)}>
              <Fuel size={16} aria-hidden="true" />
              <span><b>{p.name}</b><small>{p.road}. {p.has}.{p.note && ` ${p.note}`}</small></span>
              <em>{p.state === 'passed' ? 'Passed' : p.state === 'plain' ? `mile ${Math.round(p.mile)}` : miles(p.gap)}</em>
            </button>
            {picked === p.id && <a className="text-btn" href={plazaNav(p)} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" />Navigate<span className="sr"> to {p.name}, opens in a new tab</span></a>}
          </li>
        ))}
      </ol>
      {track === 'day1' && <p className="muted">No plazas between Stockbridge and Latham.</p>}
      {track === 'day2' && <p className="muted">No plazas with fuel on Day 2. Fill up in Latham and Manchester, then use town exits.</p>}
      <a className="text-btn" href="https://www.google.com/maps/search/?api=1&query=gas+station+with+restroom" target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Gas & Restrooms Near Me<span className="sr">, opens Google Maps in a new tab</span></a>
      <p className="muted">Your location stays on this device. A passenger should use this while driving.</p>
    </div>
  )
}
