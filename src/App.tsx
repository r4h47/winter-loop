import { useEffect, useMemo, useState } from 'react'
import { CalendarMenu } from './components/CalendarMenu'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { TripDay } from './components/TripDay'
import { Itinerary } from './components/Itinerary'
import { RouteMap, type View } from './components/RouteMap'
import { Stays } from './components/Stays'
import { Packing } from './components/Packing'
import { Costs } from './components/Costs'
import { activeStops, blocks, credits, duration, motelLeave, motels, totals, type Block, type Day, type Depart } from './data/trip'
import { defaultCosts, GROUP, isCosts, planRange, readCosts, syncGas, withBeds } from './lib/costs'
import { planFromHash, planLink } from './lib/share'
import './lib/offline'
import { usd } from './lib/money'
import { useLive } from './lib/location'
import type { Track } from './lib/plazas'
import { scrollToId, useStored } from './lib/hooks'

type Ui = { track: Track | null; day: Day; detour: boolean; block: Block | 'All'; stop: string; view: View; depart: Depart }
const isString = (v: unknown): v is string => typeof v === 'string'

const initial = (): Ui => {
  const q = new URLSearchParams(location.search)
  const detour = q.get('detour') !== '0'
  const view = q.get('view')
  const track = q.get('plazas')
  return {
    detour,
    track: track === 'day1' || track === 'day2' || track === 'storm' ? track : null,
    day: q.get('day') === '2' ? 2 : 1,
    block: blocks.find((b) => b === q.get('time')) ?? 'All',
    stop: activeStops(detour).find((s) => s.id === q.get('stop'))?.id ?? 'stockbridge',
    view: view === 'day1' || view === 'day2' ? view : 'all',
    depart: q.get('depart') === '27' ? '27' : '26',
  }
}

export default function App() {
  const [ui, setUi] = useState(initial)
  const [motel, setMotelId] = useStored('winter-loop:motel', '', isString)
  const [stored, setCosts] = useStored('winter-loop:costs', defaultCosts, isCosts)
  const costs = useMemo(() => readCosts(stored) ?? defaultCosts, [stored])
  const [incoming, setIncoming] = useState(planFromHash)
  const patch = (p: Partial<Ui>) => setUi((u) => ({ ...u, ...p }))
  const stops = useMemo(() => activeStops(ui.detour), [ui.detour])

  const route = totals(stops)
  const miles = Math.round(route.miles)
  const other = totals(activeStops(!ui.detour))
  const range = planRange(miles, costs.beds)
  const price = `${usd(Math.floor(range.low / GROUP))}–${usd(Math.ceil(range.high / GROUP))}`
  const tradeoff = `You leave the motel at ${motelLeave(true)} either way. Skipping Saratoga gives you 1 hr 45 min more in Manchester and 25 min more in Bennington, and cuts ${Math.abs(miles - Math.round(other.miles))} miles and ${duration(Math.abs(route.minutes - other.minutes))} of driving.`
  useEffect(() => {
    const known = [430, Math.round(totals(activeStops(true)).miles), Math.round(totals(activeStops(false)).miles)]
    setCosts((c) => syncGas(readCosts(c) ?? defaultCosts, miles, known))
  }, [miles, setCosts])

  useEffect(() => {
    const q = new URLSearchParams()
    if (ui.day === 2) q.set('day', '2')
    if (ui.block !== 'All') q.set('time', ui.block)
    if (!ui.detour) q.set('detour', '0')
    if (ui.depart === '27') q.set('depart', '27')
    if (ui.view !== 'all') q.set('view', ui.view)
    if (ui.track) q.set('plazas', ui.track)
    if (ui.stop !== 'stockbridge') q.set('stop', ui.stop)
    const s = q.toString()
    history.replaceState(null, '', `${location.pathname}${s ? `?${s}` : ''}${location.hash}`)
  }, [ui])

  const setDay = (day: Day) => patch({ day, view: `day${day}`, stop: stops.find((s) => s.id === ui.stop)?.day === day ? ui.stop : stops.find((s) => s.day === day && s.photo)!.id })
  const setView = (view: View) => {
    patch({ track: null })
    if (view === 'all') patch({ view })
    else setDay(view === 'day1' ? 1 : 2)
  }
  const select = (id: string) => {
    const s = stops.find((x) => x.id === id)
    if (s) patch({ stop: id, day: s.day, view: ui.view === 'all' ? 'all' : `day${s.day}` })
  }
  const open = (id: string) => {
    const s = stops.find((x) => x.id === id)
    if (!s) return
    patch({ stop: id, day: s.day, block: 'All' })
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToId(`stop-${id}`)))
  }
  const showMap = (id: string) => {
    const s = stops.find((x) => x.id === id)
    if (s) patch({ stop: id, view: `day${s.day}`, track: null })
    scrollToId('map')
  }
  const gps = useLive()
  const setTrack = (track: Track | null) => {
    if (!track) gps.stop()
    patch(track ? { track, view: track === 'day1' ? 'day1' : 'day2' } : { track })
  }
  const showPlazas = (day: Day) => {
    setTrack(`day${day}`)
    gps.start()
    scrollToId('map')
  }
  const setDetour = (detour: boolean) => patch({ detour, stop: !detour && ui.stop === 'saratoga' ? 'bennington' : ui.stop })
  const setMotel = (id: string) => {
    setMotelId(id)
    const m = motels.find((x) => x.id === id)
    if (m) setCosts((c) => ({ ...c, amounts: { ...c.amounts, motel: String(m.high * (c.beds === 'two' ? 2 : 1)) } }))
  }

  const closeIncoming = () => {
    setIncoming(null)
    history.replaceState(null, '', location.pathname + location.search)
  }
  useEffect(() => {
    const onHash = () => { const p = planFromHash(); if (p) setIncoming(p) }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav link={() => planLink({ costs, motel })} calendar={<CalendarMenu stops={stops} depart={ui.depart} motel={motel} />} />
      {incoming && (
        <div className="incoming" role="region" aria-label="Shared plan">
          <div className="wrap">
            <p>This link has a shared plan with names, costs, and a motel choice. Loading it replaces the ones saved in this browser.</p>
            <div className="btns">
              <button type="button" className="btn-primary btn-mid" onClick={() => { setCosts(() => incoming.costs); setMotelId(incoming.motel); closeIncoming() }}>Load Shared Plan</button>
              <button type="button" className="btn-secondary btn-mid" onClick={closeIncoming}>Keep Mine</button>
            </div>
          </div>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Hero depart={ui.depart} setDepart={(depart) => patch({ depart })} miles={miles} price={price} />
        <TripDay onPlazas={showPlazas} stops={stops} depart={ui.depart} motel={motel} />
        <Itinerary stops={stops} day={ui.day} setDay={setDay} block={ui.block} setBlock={(block) => patch({ block })} depart={ui.depart} detour={ui.detour} setDetour={setDetour} tradeoff={tradeoff} selected={ui.stop} onShowMap={showMap} />
        <RouteMap stops={stops} view={ui.view} setView={setView} motel={motel} selected={ui.stop} onSelect={select} onOpen={open} track={ui.track} setTrack={setTrack} gps={gps} />
        <Stays motel={motel} setMotel={setMotel} people={costs.people} beds={costs.beds} setBeds={(b) => setCosts((c) => withBeds(readCosts(c) ?? defaultCosts, b))} depart={ui.depart} stops={stops} />
        <Packing />
        <Costs costs={costs} setCosts={setCosts} miles={miles} />
      </main>
      <footer className="footer">
        <div className="wrap">
          <p>Rates, hours, and road conditions change. Confirm the motel, the rink, and the forecast before you leave. Some photographs show the stops in other seasons.</p>
          <p className="credits">Photos, cropped, via Wikimedia Commons: {credits.map(([t, a, l, f], i) => <span key={t}>{i > 0 && '; '}<a href={`https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f.replaceAll(' ', '_'))}`} target="_blank" rel="noreferrer">{t}</a> by {a}, {l}</span>)}. Routes © OpenStreetMap contributors, via OSRM. State lines from the U.S. Census Bureau. Forecast by Open-Meteo. Prayer times by AlAdhan.</p>
        </div>
      </footer>
    </>
  )
}
