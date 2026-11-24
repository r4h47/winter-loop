import { useEffect, useState } from 'react'
import { Check, Clock, MapPin, Navigation, RotateCcw } from 'lucide-react'
import { departures, duration, legInfo, motels, type Day, type Depart, type Stop } from '../data/trip'
import { easternNow, toMinutes, toTime, tripDayToday } from '../lib/clock'
import { useStored } from '../lib/hooks'

type State = { day: Day; at: number; late: number; left?: number }
const start: State = { day: 1, at: 1, late: 0 }
const valid = (v: unknown): v is State => {
  if (typeof v !== 'object' || v === null) return false
  const s = v as State
  return (s.day === 1 || s.day === 2) && Number.isInteger(s.at) && s.at >= 1 && s.at <= 9 && Number.isInteger(s.late) && s.late >= 0 && s.late <= 720
}

function warning(stop: Stop, arrive: number) {
  if (stop.id === 'plaza' && arrive >= 18 * 60) return 'The last skating session will be over. Go straight to the motel.'
  if (stop.id === 'plaza' && arrive > 16 * 60) return 'You will miss the 4:00 PM start. The session still runs to 6:00 PM.'
  if (stop.id === 'bennington' && arrive > 13 * 60) return 'Running late. Cut Manchester lunch short to keep VT‑30 in daylight.'
  if (stop.id === 'manchester' && arrive > 14 * 60 + 30) return 'Skip the long lunch. Sunset is about 4:20 PM and VT‑30 is dark after that.'
  return ''
}

export function TripDay({ stops, depart, motel }: { stops: Stop[]; depart: Depart; motel: string }) {
  const [s, set] = useStored<State>('winter-loop:trip-day', start, valid)
  const [today, setToday] = useState(() => tripDayToday(depart))
  useEffect(() => {
    const tick = () => setToday(tripDayToday(depart))
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [depart])
  // Open on the right day when the trip is under way.
  useEffect(() => {
    if (today) set((x) => (x.day === today ? x : { day: today, at: 1, late: 0 }))
  }, [today, set])

  const list = stops.filter((x) => x.day === s.day)
  const at = Math.min(s.at, list.length - 1)
  const finished = s.at >= list.length
  const next = list[at]
  const prev = list[at - 1]
  const need = next.leg ? legInfo(next.leg).minutes : 0
  const arrive = toMinutes(next.time) + s.late
  const lodging = motels.find((m) => m.id === motel)
  const address = next.id === 'latham' && lodging ? lodging.address : next.query
  const nav = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(address)}`
  /** Skating ends at 6:00 PM whatever time you arrive, so a late start there does not delay check-in. */
  const rinkAt = list.findIndex((x) => x.id === 'plaza')
  const lateAt = (i: number) => (i < s.at ? 0 : rinkAt >= s.at && i > rinkAt && toMinutes(list[rinkAt].time) + s.late <= 18 * 60 ? 0 : s.late)
  const note = finished ? '' : warning(next, arrive)

  const go = (p: Partial<State>) => set((x) => ({ ...x, ...p }))
  const leaveNow = () => {
    const now = easternNow().minutes
    go({ left: now, late: Math.min(720, Math.max(0, now + need - toMinutes(next.time))) })
  }
  const arrived = () => go({ at: at + 1, left: undefined, late: next.id === 'plaza' && arrive <= 18 * 60 ? 0 : s.late })

  return (
    <section id="trip-day" className="section soft" aria-labelledby="trip-day-h" tabIndex={-1}>
      <div className="wrap">
        <h2 id="trip-day-h">Trip Day</h2>
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Trip day to follow">
            {([1, 2] as Day[]).map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={s.day === d} onClick={() => go({ day: d, at: 1, late: 0, left: undefined })}>Day {d}</button>
            ))}
          </div>
          <p className="map-sum num" role="status">{s.late ? <b>Running {duration(s.late)} behind</b> : <b>On schedule</b>}{today ? '' : `. Preview until ${departures[depart].start}`}</p>
        </div>
        <div className="today">
          <div className="today-next">
            {finished ? (
              <>
                <h3>Day {s.day} Done</h3>
                <p>{s.day === 1 ? 'Everyone is checked in. Switch to Day 2 in the morning.' : 'Everyone is home.'}</p>
              </>
            ) : (
              <>
                <p className="muted">Next stop</p>
                <h3 className="today-title">{next.title}</h3>
                <dl className="today-times num">
                  <div><dt>{s.left === undefined ? 'Leave' : 'Left'} {prev.where.split(', ').at(-2)}</dt><dd>{toTime(s.left ?? toMinutes(prev.until) + s.late)}</dd></div>
                  <div><dt>Arrive</dt><dd>{toTime(arrive)}</dd></div>
                  <div><dt>Drive</dt><dd>{need ? duration(need) : 'None'}</dd></div>
                </dl>
                <p className="today-addr"><MapPin size={16} aria-hidden="true" /><span>{address}</span></p>
                {next.booking && <p className="muted">{next.booking}</p>}
                {note && <p className="error" role="alert">{note}</p>}
                <div className="btns">
                  <a className="btn-primary" href={nav} target="_blank" rel="noreferrer"><Navigation size={16} aria-hidden="true" />Navigate<span className="sr"> to {next.title}, opens in a new tab</span></a>
                  <button type="button" className="btn-secondary" disabled={today !== s.day} onClick={leaveNow}><Clock size={16} aria-hidden="true" />Leaving Now</button>
                  <button type="button" className="btn-secondary" onClick={arrived}><Check size={16} aria-hidden="true" />We Arrived</button>
                </div>
              </>
            )}
            <div className="today-tools">
              <button type="button" className="text-btn" disabled={s.late >= 705} onClick={() => go({ late: s.late + 15, left: undefined })}>Add 15 Min Delay</button>
              <button type="button" className="text-btn" disabled={s.at <= 1} onClick={() => go({ at: Math.max(1, Math.min(s.at, list.length) - 1), left: undefined })}>Previous Stop</button>
              <button type="button" className="text-btn" disabled={s.at === 1 && !s.late} onClick={() => go({ at: 1, late: 0, left: undefined })}><RotateCcw size={16} aria-hidden="true" />Reset Day</button>
            </div>
          </div>
          <ol className="today-list num" aria-label={`Day ${s.day} schedule`}>
            {list.map((x, i) => (
              <li key={x.id} data-state={i < s.at ? 'done' : i === at && !finished ? 'next' : undefined} aria-current={i === at && !finished ? 'step' : undefined}>
                <time>{toTime(toMinutes(x.time) + lateAt(i))}</time><span>{x.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
