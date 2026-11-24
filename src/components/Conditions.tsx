import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { departures, type Depart } from '../data/trip'

const places = [
  { key: 'Albany', day: 0, at: [42.65, -73.76] },
  { key: 'Saratoga Springs', day: 1, at: [43.08, -73.78] },
  { key: 'Manchester', day: 1, at: [43.18, -73.06] },
  { key: 'Boston', day: 1, at: [42.36, -71.06] },
] as const

/* AlAdhan, ISNA angles, Hanafi Asr, at the place the schedule puts you. */
type Prayer = [time: string, place: string]
const day1: Prayer[] = [['5:48 AM', 'Boston'], ['7:15 AM', 'Worcester'], ['11:54 AM', 'Pittsfield'], ['2:46 PM', 'Albany'], ['4:28 PM', 'Albany'], ['5:53 PM', 'Albany']]
const day2 = (fajr: string, dhuhr: string, asr: string, isha: string): Prayer[] => [[fajr, 'Latham'], ['7:25 AM', 'Latham'], [dhuhr, 'Saratoga'], [asr, 'Bennington'], ['4:24 PM', 'Manchester'], [isha, 'Manchester']]
const prayer: Record<Depart, Prayer[][]> = { '26': [day1, day2('5:59 AM', '11:56 AM', '2:43 PM', '5:49 PM')], '27': [day1, day2('6:00 AM', '11:57 AM', '2:44 PM', '5:50 PM')] }
const cols = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

const sky = (c: number) =>
  c === 0 ? 'Clear' : c <= 3 ? 'Partly cloudy' : c <= 48 ? 'Fog' : c <= 57 ? 'Drizzle' : c === 66 || c === 67 ? 'Freezing rain' : c <= 65 ? 'Rain' : c <= 77 ? 'Snow' : c <= 82 ? 'Showers' : c <= 86 ? 'Snow showers' : 'Thunderstorms'

type Reading = { text: string; detail: string }
type State = { kind: 'early' } | { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; rows: Reading[]; at: number }
const KEY = 'winter-loop:weather'

async function load(iso: string[], signal: AbortSignal): Promise<Reading[]> {
  const q = new URLSearchParams({
    latitude: places.map((p) => p.at[0]).join(), longitude: places.map((p) => p.at[1]).join(),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,snowfall_sum', temperature_unit: 'fahrenheit', precipitation_unit: 'inch',
    timezone: 'America/New_York', start_date: iso[0], end_date: iso[1],
  })
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal })
  if (!r.ok) throw new Error('forecast')
  const data = (await r.json()) as { daily: { weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; snowfall_sum: number[] } }[]
  return places.map((p, i) => {
    const d = data[i].daily
    const snow = d.snowfall_sum[p.day]
    return { text: sky(d.weather_code[p.day]), detail: `${Math.round(d.temperature_2m_min[p.day])}–${Math.round(d.temperature_2m_max[p.day])} °F, ${snow >= 0.1 ? `${snow.toFixed(1)} in snow` : 'no snow'}` }
  })
}

export function Conditions({ depart }: { depart: Depart }) {
  const { iso, days } = departures[depart]
  const opens = new Date(days[1].getTime() - 14 * 86400e3)
  const [now] = useState(() => Date.now())
  const inRange = now >= opens.getTime() && now <= days[1].getTime() + 86400e3
  const [fetched, setState] = useState<State>({ kind: 'loading' })
  const state: State = inRange ? fetched : { kind: 'early' }
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!inRange) return
    const ctl = new AbortController()
    let saved: { iso: string; rows: Reading[]; at: number } | null = null
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    } catch {
      saved = null
    }
    const keep = saved?.iso === iso[0] && saved.rows?.length === places.length ? saved : null
    const first = setTimeout(() => setState(keep ? { kind: 'ready', ...keep } : { kind: 'loading' }))
    load([...iso], ctl.signal).then((rows) => {
      const at = Date.now()
      clearTimeout(first)
      setState({ kind: 'ready', rows, at })
      try {
        localStorage.setItem(KEY, JSON.stringify({ iso: iso[0], rows, at }))
      } catch {
        // The forecast still shows for this visit.
      }
    }).catch(() => {
      if (!ctl.signal.aborted && !keep) setState({ kind: 'error' })
    })
    return () => {
      clearTimeout(first)
      ctl.abort()
    }
  }, [iso, inRange, tries])

  const shortDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' })
  return (
    <div className="conditions">
      <div className="cond-col">
        <h3>Forecast</h3>
        <div role="status">
          {state.kind === 'early' && <p className="cond-note">{now < opens.getTime() ? `Forecasts for your dates open ${shortDate.format(opens)}.` : 'The trip dates have passed.'}</p>}
          {state.kind === 'loading' && <p className="cond-note"><LoaderCircle className="spin" size={16} aria-hidden="true" />Loading the forecast…</p>}
          {state.kind === 'error' && <p className="cond-note">The forecast did not load. <button type="button" className="text-btn" onClick={() => setTries((n) => n + 1)}>Try Again</button></p>}
          {state.kind === 'ready' && (
            <ul className="cond-list num">
              {places.map((p, i) => <li key={p.key}><span>Day {p.day + 1}, {p.key}</span><span><b>{state.rows[i].text}</b> {state.rows[i].detail}</span></li>)}
            </ul>
          )}
        </div>
        {state.kind === 'ready' && <p className="muted num">Open-Meteo, updated {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(state.at)}</p>}
      </div>
      <div className="cond-col">
        <h3>Daylight & Prayer Times</h3>
          <table className="prayer num">
            <thead><tr><th scope="col"><span className="sr">Time</span></th>{[1, 2].map((d) => <th scope="col" key={d}>Day {d}</th>)}</tr></thead>
            <tbody>{cols.map((c, i) => <tr key={c}><th scope="row">{c}</th>{prayer[depart].map((r, d) => <td key={d}><b>{r[i][0].replace(' ', '\u00a0')}</b> <span>{r[i][1]}</span></td>)}</tr>)}</tbody>
          </table>
        <p className="muted">Hanafi Asr, ISNA angles for Fajr and Isha. Maghrib is sunset. Towns follow the schedule, so use your local time if you run late.</p>
      </div>
    </div>
  )
}
