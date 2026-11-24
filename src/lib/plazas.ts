import map from '../data/map.json'
import { duration, type LegKey, type Stop } from '../data/trip'

type Drive = 'day1' | 'day2' | 'storm'
export type Track = 'all' | Drive
export type Point = [number, number]
export type Plaza = { id: string; name: string; road: string; leg: LegKey; lon: number; lat: number; has: string; note?: string }

/* Positions are from OpenStreetMap. Only places on your side of the road are listed. */
const FULL = 'Fuel, food, restrooms'
export const plazas: Record<Drive, Plaza[]> = {
  day1: [
    { id: 'framingham', name: 'Framingham', road: 'I‑90 West', leg: 'boston-stockbridge', lon: -71.42837, lat: 42.31217, has: FULL },
    { id: 'westborough', name: 'Westborough', road: 'I‑90 West', leg: 'boston-stockbridge', lon: -71.59159, lat: 42.24537, has: FULL, note: 'A rebuild is planned here. Confirm it is open.' },
    { id: 'charlton-w', name: 'Charlton West', road: 'I‑90 West', leg: 'boston-stockbridge', lon: -71.96376, lat: 42.15642, has: FULL, note: 'A rebuild is planned here. Confirm it is open.' },
    { id: 'ludlow-w', name: 'Ludlow West', road: 'I‑90 West', leg: 'boston-stockbridge', lon: -72.45543, lat: 42.17087, has: FULL },
    { id: 'blandford-w', name: 'Blandford West', road: 'I‑90 West', leg: 'boston-stockbridge', lon: -72.93298, lat: 42.195, has: FULL, note: 'Last plaza before Stockbridge.' },
  ],
  day2: [
    { id: 'clifton', name: 'Clifton Park', road: 'I‑87 North', leg: 'latham-saratoga', lon: -73.77667, lat: 42.87685, has: 'Restrooms, vending. No fuel', note: 'Only on the Saratoga route.' },
    { id: 'bennington-wc', name: 'Bennington Welcome Center', road: 'VT‑279 at US‑7', leg: 'monument-manchester', lon: -73.20412, lat: 42.90415, has: 'Restrooms. No fuel', note: 'Listed 7 AM to 7 PM. Turn off at the VT‑279 junction.' },
  ],
  storm: [
    { id: 'lee-e', name: 'Lee East', road: 'I‑90 East', leg: 'storm', lon: -73.27476, lat: 42.29695, has: FULL },
    { id: 'blandford-e', name: 'Blandford East', road: 'I‑90 East', leg: 'storm', lon: -72.93385, lat: 42.19468, has: FULL },
    { id: 'ludlow-e', name: 'Ludlow East', road: 'I‑90 East', leg: 'storm', lon: -72.45426, lat: 42.16923, has: FULL },
    { id: 'charlton-e', name: 'Charlton East', road: 'I‑90 East', leg: 'storm', lon: -72.02518, lat: 42.13998, has: FULL, note: 'A rebuild is planned here. Confirm it is open.' },
    { id: 'natick', name: 'Natick', road: 'I‑90 East', leg: 'storm', lon: -71.36434, lat: 42.31167, has: FULL },
  ],
}

/* Same Mercator as scripts/build-map.mjs. */
const rad = Math.PI / 180
const SCALE = 21000
const north = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * rad) / 2))
export const project = (lon: number, lat: number): Point => [800 + SCALE * (lon + 72.4) * rad, 550 - SCALE * (north(lat) - north(42.72))]
const milesPerPx = (3958.8 * Math.cos(42.5 * rad)) / SCALE

const parse = (d: string): Point[] => d.slice(1).split('L').map((p) => p.split(',').map(Number) as Point)

type Segment = { a: Point; b: Point; mile: number; miles: number; min: number; mins: number }
export type Path = { segments: Segment[]; miles: number }

/** Strings the track's legs together, with true leg miles and minutes spread along the line. */
export function trackPath(track: Drive, stops: Stop[]): Path {
  const keys: LegKey[] = track === 'storm' ? ['storm'] : stops.filter((s) => s.day === (track === 'day1' ? 1 : 2)).flatMap((s) => s.leg?.legs ?? [])
  const segments: Segment[] = []
  let mile = 0
  let min = 0
  for (const k of keys) {
    const pts = parse(map.legs[k].d)
    const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
    const total = len.reduce((a, b) => a + b, 0) || 1
    len.forEach((l, i) => {
      const miles = (l / total) * map.legs[k].miles
      const mins = (l / total) * map.legs[k].minutes
      segments.push({ a: pts[i], b: pts[i + 1], mile, miles, min, mins })
      mile += miles
      min += mins
    })
  }
  return { segments, miles: mile }
}

/** Nearest place on the path: how far along it is, and how far off it you are. */
export function locate(path: Path, p: Point) {
  let best = { mile: 0, min: 0, off: Infinity }
  for (const s of path.segments) {
    const [dx, dy] = [s.b[0] - s.a[0], s.b[1] - s.a[1]]
    const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / (dx * dx + dy * dy || 1)))
    const off = Math.hypot(p[0] - s.a[0] - t * dx, p[1] - s.a[1] - t * dy) * milesPerPx
    if (off < best.off) best = { mile: s.mile + t * s.miles, min: s.min + t * s.mins, off }
  }
  return best
}

export type Ahead = Plaza & { drive: Drive; at: Point; mile: number; min: number; gap: number; wait: number; state: 'ahead' | 'next' | 'passed' | 'plain' }
export const OFF_ROUTE = 4

const stopsOn = (drive: Drive, stops: Stop[]) => {
  const path = trackPath(drive, stops)
  const used = new Set<LegKey>(drive === 'storm' ? ['storm'] : stops.flatMap((s) => s.leg?.legs ?? []))
  return { path, list: plazas[drive].filter((p) => used.has(p.leg)).map((p) => {
    const at = project(p.lon, p.lat)
    const { mile, min } = locate(path, at)
    return { ...p, drive, at, mile, min, gap: 0, wait: 0, state: 'plain' as Ahead['state'] }
  }).sort((a, b) => a.mile - b.mile) }
}

/** Every plaza on the track in driving order, measured from `me` when you are on the route. */
export function plazaList(track: Track, stops: Stop[], me: Point | null, today: 1 | 2 | null = null) {
  const drives: Drive[] = track === 'all' ? ['day1', 'day2'] : [track]
  const parts = drives.map((d) => ({ ...stopsOn(d, stops), drive: d, pos: null as ReturnType<typeof locate> | null }))
  for (const p of parts) p.pos = me && locate(p.path, me)
  // Both days share roads near Boston and Latham. Trust the calendar first, then the closer drive.
  const sorted = [...parts].sort((a, b) => (a.pos?.off ?? 0) - (b.pos?.off ?? 0))
  const onToday = parts.find((p) => today && p.drive === `day${today}` && p.pos && p.pos.off <= OFF_ROUTE)
  const mine = onToday ?? sorted[0]
  const onRoute = !!mine.pos && mine.pos.off <= OFF_ROUTE
  let nextFound = false
  const list: Ahead[] = parts.flatMap((part) => part.list.map((p): Ahead => {
    if (!mine.pos || !onRoute) return p
    if (part.drive !== mine.drive) return { ...p, state: drives.indexOf(part.drive) < drives.indexOf(mine.drive) ? 'passed' : 'plain' }
    const gap = p.mile - mine.pos.mile
    if (gap < -0.2) return { ...p, gap, state: 'passed' }
    const state = nextFound ? 'ahead' : 'next'
    nextFound = true
    return { ...p, gap: Math.max(0, gap), wait: Math.max(0, p.min - mine.pos.min), state }
  }))
  return { list, off: mine.pos?.off ?? null, onRoute, next: list.find((p) => p.state === 'next') ?? null }
}

export const miles = (n: number) => `${n < 10 ? n.toFixed(1) : Math.round(n)} mi`
export const wait = (n: number) => duration(Math.max(1, Math.round(n)))
export const plazaNav = (p: Plaza) => `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${p.lat},${p.lon}`
