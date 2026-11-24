import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ExternalLink, Fuel } from 'lucide-react'
import map from '../data/map.json'
import { directionsUrl, duration, legInfo, totals, type Day, type PointKey, type Stop } from '../data/trip'
import { plazaList, type Track } from '../lib/plazas'
import type { useLive } from '../lib/location'
import { Photo } from './Photo'
import { PlazaPanel } from './PlazaPanel'

export type View = 'all' | 'day1' | 'day2'
type Props = { stops: Stop[]; view: View; setView: (v: View) => void; motel: string; selected: string; onSelect: (id: string) => void; onOpen: (id: string) => void; track: Track | null; setTrack: (t: Track | null) => void; gps: ReturnType<typeof useLive> }

const leftSide = new Set<PointKey>(['plaza', 'latham', 'saratoga', 'stockbridge', 'manchester'])
const short: Record<string, string> = { boston: 'Boston', stockbridge: 'Stockbridge', pittsfield: 'Pittsfield', plaza: 'Albany', latham: 'Latham', saratoga: 'Saratoga', silk: 'Bennington', manchester: 'Manchester' }
const views: [View, string][] = [['all', 'Full Route'], ['day1', 'Day 1'], ['day2', 'Day 2']]

export function RouteMap({ stops, view, setView, motel, selected, onSelect, onOpen, track, setTrack, gps }: Props) {
  const [picked, setPicked] = useState('')
  const [near, setNear] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { live } = gps
  const me = live.kind === 'on' ? live.at : null
  const road = useMemo(() => (track ? plazaList(track, stops, me) : null), [track, stops, me])

  const inView = (d: Day) => view === 'all' || view === `day${d}`
  const points = useMemo(() => {
    const seen = new Map<PointKey, Stop[]>()
    for (const s of stops) seen.set(s.point, [...(seen.get(s.point) ?? []), s])
    return [...seen.entries()]
  }, [stops])

  // Fit the visible stops to the canvas. Narrow screens drop Boston from the fit so the western stops stay tappable.
  const t = useMemo(() => {
    const { w, h } = size
    if (!w) return null
    if (road) {
      // Plaza mode: frame the plazas and you, or just you and the next one.
      const focus = near && me ? [me, ...(road.next ? [road.next.at] : [])] : [...road.list.map((p) => p.at), ...(me && road.onRoute ? [me] : [])]
      const xs = focus.map((p) => p[0])
      const ys = focus.map((p) => p[1])
      const [cx, cy] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
      const spanX = Math.max(90, Math.max(...xs) - Math.min(...xs))
      const spanY = Math.max(90, Math.max(...ys) - Math.min(...ys))
      const k = Math.min((w - 110) / spanX, (h - 150) / spanY)
      return { k, x: w / 2 - k * cx, y: h / 2 - k * cy }
    }
    const keepBoston = view === 'all' && w >= 600
    const keys = points.filter(([k, ss]) => (k !== 'boston' || keepBoston) && ss.some((s) => view === 'all' || view === `day${s.day}`)).map(([k]) => map.points[k])
    const xs = keys.map((p) => p[0])
    const ys = keys.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const narrow = w < 600
    const padL = narrow ? 82 : 92
    const padR = keepBoston ? 32 : narrow ? 45 : 120
    const padY = 56
    const k = Math.min((w - padL - padR) / (x1 - x0), (h - padY * 2) / (y1 - y0))
    return { k, x: padL + (w - padL - padR - k * (x1 - x0)) / 2 - k * x0, y: padY + (h - padY * 2 - k * (y1 - y0)) / 2 - k * y0 }
  }, [size, view, points, road, near, me])

  const at = (p: number[]) => (t ? { transform: `translate(${t.k * p[0] + t.x}px, ${t.k * p[1] + t.y}px)` } : undefined)
  const clear = (p: number[]) => {
    if (!t) return false
    const [x, y] = [t.k * p[0] + t.x, t.k * p[1] + t.y]
    return x > 56 && x < size.w - 56 && y > 16 && y < size.h - 16
  }
  const legs = stops.flatMap((s) => (s.leg ? s.leg.legs.map((k) => ({ k, day: s.day })) : [])).sort((a, b) => Number(inView(a.day)) - Number(inView(b.day)))
  const sum = totals(stops.filter((s) => inView(s.day)))
  const cur = stops.find((s) => s.id === selected) ?? stops[0]
  const drawn = track === 'storm' ? [...legs.map((l) => ({ ...l, on: false })), { k: 'storm' as const, day: 1 as Day, on: true }] : legs.map((l) => ({ ...l, on: inView(l.day) }))
  const bostonOff = !!t && t.k * map.points.boston[0] + t.x > size.w

  return (
    <section id="map" className="section soft" aria-labelledby="map-h" tabIndex={-1}>
      <div className="wrap">
        <h2 id="map-h">Route Map</h2>
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Map view">
            {views.map(([v, l]) => <button key={v} type="button" className="chip" aria-pressed={!track && view === v} onClick={() => setView(v)}>{l}</button>)}
            <button type="button" className="chip chip-icon" aria-pressed={!!track} onClick={() => setTrack(track ? null : view === 'day2' ? 'day2' : 'day1')}><Fuel size={16} aria-hidden="true" />Service Plazas</button>
          </div>
          {track ? (me && <div className="chips" role="group" aria-label="Plaza map zoom">{([[false, 'All Plazas'], [true, 'Near Me']] as const).map(([v, l]) => <button key={l} type="button" className="chip" aria-pressed={near === v} onClick={() => setNear(v)}>{l}</button>)}</div>) : <p className="map-sum num" aria-live="polite"><b>{Math.round(sum.miles)}&nbsp;miles</b>, about {duration(sum.minutes)} of driving</p>}
        </div>
        <div className="map-grid">
          <div>
            <div className="map-canvas" ref={box} role="group" aria-label={track ? 'Service plazas on the route' : 'Stops on the route'}>
              <svg width="100%" height="100%" aria-hidden="true" focusable="false">
                {t && (
                  <g className="map-g" style={{ transform: `translate(${t.x}px, ${t.y}px) scale(${t.k})` }}>
                    <path d={map.land} className="m-land" />
                    <path d={map.borders} className="m-border" />
                    {drawn.map((l) => <path key={l.k} d={map.legs[l.k].d} className={`m-leg d${l.day}${l.on ? '' : ' off'}`} />)}
                  </g>
                )}
              </svg>
              {t && map.labels.filter((l) => clear(l.at)).map((l) => <span key={l.name} className="m-state" aria-hidden="true" style={at(l.at)}><i>{l.name}</i></span>)}
              {t && road?.list.map((p, i) => (
                <button key={p.id} type="button" className={`pin plaza ${i % 2 ? 'below' : 'above'}`} style={at(p.at)} data-state={p.state} data-bare={(size.w < 600 && p.state !== 'next' && picked !== p.id) || undefined} aria-pressed={picked === p.id} onClick={() => setPicked(p.id)}>
                  <span className="dot"><Fuel size={14} aria-hidden="true" /></span><span className="pin-label">{p.name}</span>{p.state === 'next' && <span className="sr">, next ahead</span>}
                </button>
              ))}
              {t && track && me && <span className="me" style={at(me)} role="img" aria-label="You are here"><i /></span>}
              {t && !track && points.map(([k, ss], i) => {
                const s = ss.find((x) => inView(x.day)) ?? ss[0]
                return (
                  <button key={k} type="button" className={`pin ${['saratoga', 'manchester', 'pittsfield'].includes(k) && size.w < 600 ? 'above' : leftSide.has(k) ? 'left' : k === 'boston' || (k === 'silk' && size.w < 600) ? 'below' : 'right'}`} style={at(map.points[k])} data-day={s.day} hidden={(k === 'boston' && bostonOff) || !ss.some((x) => inView(x.day))} aria-pressed={ss.some((x) => x.id === selected)} onClick={() => onSelect(s.id)}>
                    <span className="dot num">{i + 1}</span>{' '}<span className="pin-label">{short[k]}</span><span className="sr">: {ss.map((x) => `${x.title}, Day ${x.day}`).join('; ')}</span>
                  </button>
                )
              })}
              {bostonOff && !track && <span className="edge">Boston<ArrowRight size={14} aria-hidden="true" /></span>}
            </div>
            <p className="legend" hidden={track === 'storm'}>
              {[1, 2].map((d) => <span key={d}><svg width="32" height="6" aria-hidden="true"><line x1="3" y1="3" x2="29" y2="3" className={`m-leg d${d}`} /></svg>Day {d}</span>)}
            </p>
          </div>
          {track && road ? (
            <PlazaPanel track={track} setTrack={(x) => { setPicked(''); setTrack(x) }} {...road} live={live} start={gps.start} stop={() => { setNear(false); gps.stop() }} picked={picked} onPick={setPicked} />
          ) : <div className="map-side" aria-live="polite">
            {cur.photo && <Photo name={cur.photo.name} alt={cur.photo.alt} sizes="(min-width: 1128px) 360px, calc(100vw - 48px)" />}
            <p className="num muted">Day {cur.day}, {cur.time}{cur.until !== cur.time && ` to ${cur.until}`}</p>
            <h3>{cur.title}</h3>
            <p>{cur.where}</p>
            {cur.leg && <p className="num">{Math.round(legInfo(cur.leg).miles)}&nbsp;miles, {duration(legInfo(cur.leg).minutes)}</p>}
            <div className="btns">
              <button type="button" className="btn-primary" onClick={() => onOpen(cur.id)}>Open in Itinerary</button>
              <a className="btn-secondary" href={directionsUrl(stops, view, motel)} target="_blank" rel="noreferrer">Open in Google Maps<ExternalLink size={16} aria-hidden="true" /><span className="sr">: {views.find(([v]) => v === view)?.[1]} directions, opens in a new tab</span></a>
            </div>
            <p className="muted">Directions cover {view === 'all' ? 'the full route' : view === 'day1' ? 'Day 1' : 'Day 2'}, every stop in order.</p>
          </div>}
        </div>
      </div>
    </section>
  )
}
