import { useState } from 'react'
import { Check, Download, Printer } from 'lucide-react'
import { departures, motels, type Depart, type Stop } from '../data/trip'
import { download } from '../lib/ics'
import { offlineReady } from '../lib/offline'

const STORM = 'Storm rule: check New England 511 at noon on Day 2. If VT-30 is snow-covered or under an advisory, skip Manchester and return by NY-7 to Albany and I-90 East (about 208 miles, 4 hr 27 min).'

function lines(stops: Stop[], depart: Depart, motelId: string) {
  const m = motels.find((x) => x.id === motelId)
  const out = ['WINTER LOOP TRIP CARD', departures[depart].short, '', `Motel: ${m ? `${m.name}, ${m.address}. ${m.checkIn}` : 'not chosen yet'}`]
  for (const day of [1, 2]) {
    out.push('', `DAY ${day}: ${day === 1 ? departures[depart].start : departures[depart].end}`)
    for (const s of stops.filter((x) => x.day === day)) {
      out.push(`${s.time}  ${s.title}`, `  ${s.id === 'latham' || s.id === 'breakfast' ? (m ? `${m.name}, ${m.address}` : 'Motel, not chosen yet') : s.query}`)
      if (s.leg) out.push(`  ${s.leg.label}, ${s.leg.road}`)
      if (s.booking) out.push(`  ${s.booking}`)
    }
  }
  out.push('', 'Return: VT-30 to Brattleboro, I-91 South, Route 2 East.', STORM, 'Roads: mass511.com, 511ny.org, newengland511.org')
  return out.map((x) => x.replaceAll('‑', '-').replaceAll(' ', ' '))
}

export function TripCard({ stops, depart, motel }: { stops: Stop[]; depart: Depart; motel: string }) {
  const [saved, setSaved] = useState(false)
  const text = lines(stops, depart, motel)
  return (
    <>
      <div className="roads trip-card-bar">
        <div>
          <h3>Offline Trip Card</h3>
          <p className="muted">{offlineReady ? 'After one visit, this page also opens without signal.' : 'Save a copy before you lose signal.'}</p>
        </div>
        <div className="btns">
          <button type="button" className="btn-secondary btn-mid" onClick={() => { download('winter-loop-trip-card.txt', text.join('\r\n'), 'text/plain;charset=utf-8'); setSaved(true) }}>
            {saved ? <Check size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{saved ? 'Card Saved' : 'Save Trip Card'}
          </button>
          <button type="button" className="btn-secondary btn-mid" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print Card</button>
        </div>
        <span className="sr" role="status">{saved ? 'Trip card saved' : ''}</span>
      </div>
      <pre className="print-card" aria-hidden="true">{text.join('\n')}</pre>
    </>
  )
}
