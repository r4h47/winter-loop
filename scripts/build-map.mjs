// Regenerates src/data/map.json from us-atlas state outlines and OSRM route geometry.
import fs from 'node:fs'
import { geoMercator, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

const atlas = JSON.parse(fs.readFileSync('node_modules/us-atlas/states-10m.json', 'utf8'))
const route = JSON.parse(fs.readFileSync('scripts/route.json', 'utf8'))
const W = 1600
const H = 1100
const projection = geoMercator()
  .center([-72.4, 42.72])
  .scale(21000)
  .translate([W / 2, H / 2])
  .clipExtent([[-1800, -1500], [W + 1800, H + 1500]])
const path = geoPath(projection).digits(1)
const ids = new Set(['09', '23', '25', '33', '36', '44', '50', '34', '42'])
const collection = feature(atlas, atlas.objects.states)
const land = path({ type: 'FeatureCollection', features: collection.features.filter((f) => ids.has(f.id)) })
const borders = path(mesh(atlas, atlas.objects.states, (a, b) => a !== b && ids.has(a.id) && ids.has(b.id)))

const simplify = (pts, tol) => {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts.at(-1)]
  let max = 0
  let at = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
    const len = dx * dx + dy * dy
    const t = len ? Math.max(0, Math.min(1, ((pts[i][0] - a[0]) * dx + (pts[i][1] - a[1]) * dy) / len)) : 0
    const d = Math.hypot(pts[i][0] - a[0] - t * dx, pts[i][1] - a[1] - t * dy)
    if (d > max) [max, at] = [d, i]
  }
  if (max < tol) return [a, b]
  return [...simplify(pts.slice(0, at + 1), tol).slice(0, -1), ...simplify(pts.slice(at), tol)]
}
const legs = Object.fromEntries(
  route.legs.map((l) => {
    const pts = simplify(l.c.map((c) => projection(c)), 0.5)
    return [l.b ? `${l.a}-${l.b}` : l.a, { d: 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L'), miles: +l.mi.toFixed(1), minutes: Math.round(l.min) }]
  }),
)
const points = Object.fromEntries(Object.entries(route.P).map(([k, c]) => [k, projection(c).map((n) => +n.toFixed(1))]))
const labels = [['New York', -73.75, 43.3], ['Vermont', -72.85, 43.42], ['New Hampshire', -71.75, 43.1], ['Massachusetts', -72.15, 42.5], ['Connecticut', -72.7, 41.9]]
  .map(([name, x, y]) => ({ name, at: projection([x, y]).map((n) => +n.toFixed(1)) }))
fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync('src/data/map.json', JSON.stringify({ land, borders, legs, points, labels }))
