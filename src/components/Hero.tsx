import { useEffect, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { departures, type Depart } from '../data/trip'

const base = import.meta.env.BASE_URL
const pad = (n: number) => String(n).padStart(2, '0')

function Countdown({ depart }: { depart: Depart }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const start = departures[depart].days[0].getTime()
  const left = start - now
  if (left <= 0) return <p className="countdown-done">{now > start + 35 * 3600e3 ? 'Trip complete' : 'On the road now'}</p>
  const s = Math.floor(left / 1000)
  const parts = [[Math.floor(s / 86400), 'days'], [Math.floor(s / 3600) % 24, 'hours'], [Math.floor(s / 60) % 60, 'min'], [s % 60, 'sec']] as const
  return (
    <div className="countdown">
      <span className="sr">{parts[0][0]} days until departure</span>
      {parts.map(([n, l], i) => (
        <div key={l} aria-hidden="true"><b>{i ? pad(n) : n}</b><span>{l}</span></div>
      ))}
      <p>until we leave Boston at 6:30&nbsp;AM</p>
    </div>
  )
}

export function Hero({ depart, setDepart, miles, price }: { depart: Depart; setDepart: (d: Depart) => void; miles: number; price: string }) {
  return (
    <section className="hero" id="top" aria-labelledby="title">
      <img
        className="hero-img"
        src={`${base}photos/silk-road-1600.webp`}
        srcSet={`${base}photos/silk-road-960.webp 960w, ${base}photos/silk-road-1600.webp 1600w, ${base}photos/silk-road-2400.webp 2400w`}
        sizes="100vw" width={1600} height={1050} fetchPriority="high"
        alt="The red Silk Road covered bridge over the Walloomsac River in Bennington, with a wreath above its entrance"
      />
      <div className="wrap hero-body">
        <h1 id="title">A Two-Day Winter Loop From&nbsp;Boston</h1>
        <p className="hero-sub">The Berkshires, upstate New York, and southern Vermont. Five people, about {price} each.</p>
        <div className="pill">
          <div className="pill-seg pill-where">
            <span>Route</span>
            <strong>Boston, Berkshires, Albany, Vermont</strong>
          </div>
          <label className="pill-seg">
            <span>Dates</span>
            <select name="depart" value={depart} onChange={(e) => setDepart(e.target.value as Depart)} autoComplete="off">
              {(Object.keys(departures) as Depart[]).map((k) => <option key={k} value={k}>{departures[k].short}</option>)}
            </select>
          </label>
          <div className="pill-seg pill-drive">
            <span>Drive</span>
            <strong className="num">{Math.round(miles)}&nbsp;miles</strong>
          </div>
          <a className="orb" href="#itinerary"><ArrowDown size={20} aria-hidden="true" /><span>See the Itinerary</span></a>
        </div>
        <Countdown depart={depart} />
      </div>
    </section>
  )
}
