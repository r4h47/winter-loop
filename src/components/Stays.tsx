import { Clock, Coffee, ExternalLink, MapPin } from 'lucide-react'
import { mapsUrl, motelLeave, motels, roads, type Depart, type Stop } from '../data/trip'
import type { Beds } from '../lib/costs'
import { usd } from '../lib/money'
import { Conditions } from './Conditions'
import { Photo } from './Photo'
import { TripCard } from './TripCard'

type Props = { motel: string; setMotel: (id: string) => void; people: number; beds: Beds; setBeds: (b: Beds) => void; depart: Depart; stops: Stop[] }

export function Stays({ motel, setMotel, people, beds, setBeds, depart, stops }: Props) {
  return (
    <section id="stays" className="section" aria-labelledby="stays-h" tabIndex={-1}>
      <div className="wrap">
        <h2 id="stays-h">Stays & Logistics</h2>
        <p className="lede">One night around Albany and Latham, with beds for five. Pick a motel and its top rate carries into the cost splitter.</p>
        <div className="chips beds" role="group" aria-label="Sleeping plan">
          {([['two', 'Two Rooms'], ['one', 'One Room & Extra Bed']] as const).map(([b, l]) => <button key={b} type="button" className="chip" aria-pressed={beds === b} onClick={() => setBeds(b)}>{l}</button>)}
        </div>
        <p className="muted beds-note">{beds === 'two' ? 'Everyone gets a bed. Motel costs count both rooms.' : 'Cheaper, if the motel allows five in a room. Any extra-bed fee is not included.'}</p>
        <fieldset className="motels">
          <legend className="sr">Choose a motel</legend>
          {motels.map((m) => (
            <div className="motel" key={m.id} data-on={motel === m.id || undefined}>
              <label>
                <input type="radio" name="motel" value={m.id} checked={motel === m.id} onChange={() => setMotel(m.id)} />
                <span className="motel-name">{m.name}</span>
              </label>
              <p className="price num"><b>{usd(m.low)}–{usd(m.high)}</b> per room, up to {usd(Math.ceil(((m.high * (beds === 'two' ? 2 : 1)) / people) * 100) / 100)} each</p>
              <ul className="facts">
                <li><Clock size={16} aria-hidden="true" /><span className="num">{m.checkIn}</span></li>
                <li><Coffee size={16} aria-hidden="true" /><span>{m.breakfast}</span></li>
                <li><MapPin size={16} aria-hidden="true" /><span>{m.address}</span></li>
              </ul>
              <p className="motel-note">{m.note}</p>
              <a className="text-btn" href={mapsUrl(`${m.name}, ${m.address}`)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Google Maps<span className="sr">: {m.name}, opens in a new tab</span></a>
            </div>
          ))}
        </fieldset>
        <div className="roads">
          <h3>Winter Road Conditions</h3>
          <ul className="chips">
            {roads.map(([l, area, u]) => <li key={u}><a className="chip" href={u} target="_blank" rel="noreferrer">{l}<span className="road-area">{area}</span><ExternalLink size={16} aria-hidden="true" /><span className="sr">, opens in a new tab</span></a></li>)}
          </ul>
        </div>
        <Conditions depart={depart} />
        <TripCard stops={stops} depart={depart} motel={motel} />
        <div className="logistics">
          <Photo name="monument" alt="The Bennington Battle Monument above autumn trees and the Green Mountain foothills" sizes="(min-width: 1128px) 500px, calc(100vw - 48px)" />
          <dl>
            <div><dt>Room and Group</dt><dd>Two rooms is the safe choice for five. For one room, ask about the occupancy limit and an extra bed before booking.</dd></div>
            <div><dt>Arrival Window</dt><dd>You reach Latham around {stops.find((s) => s.id === 'latham')?.time}. On Day 2, sleep until 9:00 and leave at {motelLeave(true)}.</dd></div>
            <div><dt>Winter Driving</dt><dd>Check snow on NY‑7 and VT‑30 before you leave. If snow starts on the way home, use I‑91 South and I‑90 East instead of Route 2.</dd></div>
            <div><dt>Storm Rule</dt><dd>Before leaving Bennington, check New England 511. Manchester means driving VT‑30 in the dark. If VT‑30 is snow-covered or under an advisory, skip Manchester and take NY‑7 to Albany, then I‑90 East: about 208&nbsp;miles, up to 4&nbsp;hr&nbsp;27&nbsp;min.</dd></div>
            <div><dt>Drive Times</dt><dd>Every leg shows one routed drive time without traffic, on the cautious side, and the spare minutes before your arrival time. A second router came out shorter on most legs.</dd></div>
          </dl>
        </div>
      </div>
    </section>
  )
}
