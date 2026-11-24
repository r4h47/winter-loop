import map from './map.json'

export type Day = 1 | 2
export type Block = 'Morning' | 'Afternoon' | 'Evening'
export type Depart = '26' | '27'
export type LegKey = keyof typeof map.legs
export type PointKey = keyof typeof map.points

export type Leg = { label: string; road: string; plan: string; legs: LegKey[] }

export type Stop = {
  id: string
  day: Day
  block: Block
  time: string
  until: string
  status: string
  title: string
  where: string
  point: PointKey
  query: string
  text: string
  leg?: Leg
  booking?: string
  tip?: string
  photo?: { name: string; alt: string }
  optional?: boolean
  links?: [string, string][]
}

export const blocks: Block[] = ['Morning', 'Afternoon', 'Evening']

function dates(a: string, b: string) {
  const days = [new Date(`${a}T06:30:00-05:00`), new Date(`${b}T08:00:00-05:00`)] as const
  const timeZone = 'America/New_York'
  const short = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone })
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone })
  const full = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone })
  return { days, iso: [a, b], start: full.format(days[0]), end: full.format(days[1]), short: `${wd.format(days[0])}–${wd.format(days[1])}, ${short.formatRange(days[0], days[1])}` }
}

export const departures: Record<Depart, ReturnType<typeof dates>> = {
  '26': dates('2026-12-26', '2026-12-27'),
  '27': dates('2026-12-27', '2026-12-28'),
}

export const stops: Stop[] = [
  {
    id: 'boston', day: 1, block: 'Morning', time: '6:30 AM', until: '6:30 AM', status: 'Turnpike 24h', title: 'Leave Boston', where: 'Boston, MA', point: 'boston',
    query: 'Boston, MA',
    text: 'Take I‑90 West, the Mass Pike, across the state to Exit 10 in Lee. Bring breakfast, water, and drinks from home so nobody buys them at a service plaza.',
    booking: 'Bring an E-ZPass transponder for the Mass Pike and New York tolls.',
  },
  {
    id: 'stockbridge', day: 1, block: 'Morning', time: '9:45 AM', until: '11:05 AM', status: 'Outdoor / 24h', title: 'Stockbridge Main Street', where: 'Stockbridge, MA', point: 'stockbridge',
    query: '36 Main St, Stockbridge, MA 01262',
    text: 'Walk the 18th- and 19th-century storefronts Norman Rockwell painted at Christmas. The Red Lion Inn looks straight down the street.',
    leg: { label: 'From Boston, leaving 6:30 AM', road: 'I‑90 West', plan: '2 hr 15 min', legs: ['boston-stockbridge'] },
    tip: 'Stand by the Red Lion Inn and shoot down Main Street for the brick storefronts with the hills behind.',
    photo: { name: 'red-lion', alt: 'The white clapboard Red Lion Inn on Main Street in Stockbridge, with bare trees' },
  },
  {
    id: 'pittsfield', day: 1, block: 'Morning', time: '11:45 AM', until: '1:15 PM', status: 'Holiday Hours', title: 'Lunch in Pittsfield', where: 'North Street, Pittsfield, MA', point: 'pittsfield',
    query: 'North Street, Pittsfield, MA',
    text: 'Sofra Turkish Mediterranean Grill at 438 North Street serves halal shawarma and kebabs. Pizza by the slice and diners are nearby.',
    leg: { label: 'From Stockbridge, leaving 11:05 AM', road: 'US‑7 North', plan: '15 min', legs: ['stockbridge-pittsfield'] },
    booking: 'Call Sofra at (413) 884-7654 to confirm it is open on your date.',
    links: [['Sofra', 'https://www.sofraturkishma.com/']],
    tip: 'Be back in the car by 1:15 PM to park in Albany before the museum and the 4:00 PM skate.',
  },
  {
    id: 'plaza', day: 1, block: 'Afternoon', time: '2:30 PM', until: '6:00 PM', status: 'Holiday Hours', title: 'Skate at Empire State Plaza', where: 'Albany, NY', point: 'plaza',
    query: 'Empire State Plaza, Albany, NY 12210',
    text: 'Warm up in the State Museum, then skate the 4:00–6:00 PM session below the Capitol and The Egg. Entry to the rink is free.',
    leg: { label: 'From Pittsfield, leaving 1:15 PM', road: 'US‑20 and I‑90 West', plan: '45 min', legs: ['pittsfield-plaza'] },
    booking: 'Weekend sessions run 10–12, 1–3, and 4–6. Skates rent for $5 with photo ID. No December 26 or 27 hours are posted yet, and weather can close the ice, so check that morning.',
    tip: 'Take the group photo around 4:30 PM, when the plaza lights and the Capitol come on.',
    links: [['Rink Status', 'https://empirestateplaza.ny.gov/ice-rink'], ['State Museum', 'https://nysm.nysed.gov/visit']],
    photo: { name: 'plaza', alt: 'The New York State Capitol and The Egg at sunset, seen across Empire State Plaza' },
  },
  {
    links: [['Mazadar', 'https://www.mazadar.com/']],
    id: 'latham', day: 1, block: 'Evening', time: '6:45 PM', until: '9:45 PM', status: 'Check-In From 3 PM', title: 'Check In & Dinner', where: 'Latham or Colonie, NY', point: 'latham',
    query: '681 Troy Schenectady Rd, Latham, NY 12110',
    text: 'Check in to the two-queen room, then pick up dinner. Mazadar Mediterranean Kitchen at 1839 Central Avenue lists all its meat as halal.',
    leg: { label: 'From Albany, leaving 6:00 PM', road: 'local roads north', plan: '15 min', legs: ['plaza-latham'] },
    booking: 'Two queens sleep four, so book two rooms or request an extra bed, and call Mazadar to confirm its hours. Tell the desk you will arrive around 6:45 PM.',
  },
  {
    id: 'breakfast', day: 2, block: 'Morning', time: '7:00 AM', until: '7:45 AM', status: 'Breakfast 6–9 AM', title: 'Breakfast & Checkout', where: 'Latham or Colonie, NY', point: 'latham',
    query: '681 Troy Schenectady Rd, Latham, NY 12110',
    text: 'Eat at the motel, clear the windshield, and load the car.',
    booking: 'The plan lists free breakfast at the Econo Lodge and the Super 8 only. If you book the Red Roof Inn, bring breakfast.',
  },
  {
    id: 'saratoga', day: 2, block: 'Morning', time: '8:30 AM', until: '9:30 AM', status: 'Outdoor / Year-Round', title: 'Congress Park, Saratoga Springs', where: 'Saratoga Springs, NY', point: 'saratoga',
    query: '268 Broadway, Saratoga Springs, NY 12866',
    text: 'Walk the park’s mineral springs, pavilions, and bridges, then Broadway next door.',
    leg: { label: 'From Latham, leaving 7:45 AM', road: 'I‑87 North', plan: '25 min', legs: ['latham-saratoga'] },
    tip: 'The Spirit of Life and the duck pond bridges make the best morning group photo.',
    photo: { name: 'congress', alt: 'A columned stone pavilion beside the pond in Congress Park, photographed in summer' },
    optional: true,
  },
  {
    id: 'bennington', day: 2, block: 'Morning', time: '11:00 AM', until: '12:15 PM', status: 'Outdoor / 24h', title: 'Covered Bridges & the Monument', where: 'Bennington, VT', point: 'silk',
    query: 'Silk Road Covered Bridge, Bennington, VT 05201',
    text: 'Drive through the red Silk Road and Paper Mill Village bridges, then stop below the 306-foot Bennington Battle Monument.',
    leg: { label: 'From Saratoga Springs, leaving 9:30 AM', road: 'NY‑29 and NY‑67 East', plan: '45–55 min', legs: ['saratoga-silk', 'silk-paper', 'paper-monument'] },
    booking: 'The grounds are free. The monument’s listed season ends October 31 and repair work is under way, so expect exterior views only.',
    tip: 'Park in the pull-off before the Silk Road bridge and photograph the red timber against the river.',
    photo: { name: 'bridge', alt: 'The red Silk Road covered bridge in Bennington hung with a holiday wreath in winter' },
  },
  {
    id: 'manchester', day: 2, block: 'Afternoon', time: '1:15 PM', until: '3:15 PM', status: 'Holiday Hours', title: 'Lunch in Manchester', where: 'Manchester, VT', point: 'manchester',
    query: 'Main St, Manchester, VT 05254',
    text: 'Walk Manchester Center, find hot chocolate or something with maple, and eat a late lunch.',
    leg: { label: 'From Bennington, leaving 12:15 PM', road: 'US‑7 North', plan: '30 min', legs: ['monument-manchester'] },
    tip: 'Walk Main Street by the Equinox for marble sidewalks, white clapboard, and the ridge behind.',
    photo: { name: 'equinox', alt: 'The white columned Equinox hotel on Main Street in Manchester Village, photographed in summer' },
  },
  {
    id: 'home', day: 2, block: 'Evening', time: '8:00 PM', until: '8:00 PM', status: 'Check 511', title: 'Back in Boston', where: 'Boston, MA', point: 'boston',
    query: 'Boston, MA',
    text: 'Leave by 3:15 PM so most of VT‑30 is driven before the 4:20 PM sunset. Follow VT‑30 to Brattleboro, I‑91 South, then Route 2 East. Plan on 8:00 PM with one short break.',
    leg: { label: 'From Manchester, leaving 3:15 PM', road: 'VT‑30, I‑91, and Route 2', plan: '3 hr', legs: ['manchester-boston'] },
    tip: 'If southern Vermont gets heavy snow, take I‑91 South to I‑90 East instead of VT‑30.',
    links: [['New England 511', 'https://newengland511.org/'], ['Mass511', 'https://mass511.com/']],
    photo: { name: 'winhall', alt: 'The half-frozen Winhall River near VT‑30 in January' },
  },
]

const direct: Leg = { label: 'From Latham, leaving 9:45 AM', road: 'NY‑7 East', plan: '45–55 min', legs: ['latham-silk', 'silk-paper', 'paper-monument'] }

export function activeStops(detour: boolean): Stop[] {
  if (detour) return stops
  return stops.filter((s) => !s.optional).map((s) => {
    if (s.id === 'bennington') return { ...s, leg: direct }
    if (s.id === 'breakfast') return { ...s, time: '8:30 AM', until: '9:45 AM' }
    return s
  })
}

export const legInfo = (leg: Leg) =>
  leg.legs.reduce((a, k) => ({ miles: a.miles + map.legs[k].miles, minutes: a.minutes + map.legs[k].minutes }), { miles: 0, minutes: 0 })

export const totals = (list: Stop[]) =>
  list.reduce((a, s) => {
    if (!s.leg) return a
    const i = legInfo(s.leg)
    return { miles: a.miles + i.miles, minutes: a.minutes + i.minutes }
  }, { miles: 0, minutes: 0 })

export const duration = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ')
}

export const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

export const motels = [
  { id: 'super8', name: 'Super 8 Latham', address: '681 Troy Schenectady Rd, Latham, NY 12110', low: 66, high: 80, breakfast: 'Free breakfast', checkIn: '3 PM in, 11 AM out', note: 'On NY‑7, the straight shot to Vermont on Day 2. Check-in age is listed as 21.' },
  { id: 'econo', name: 'Econo Lodge Colonie Center', address: '1630 Central Ave, Albany, NY 12205', low: 55, high: 70, breakfast: 'Free continental breakfast', checkIn: '3 PM in, 11 AM out', note: 'Wi-Fi and parking included, with takeout along Central Avenue.' },
  { id: 'redroof', name: 'Red Roof Inn Albany Airport', address: '188 Wolf Rd, Albany, NY 12205', low: 52, high: 65, breakfast: 'No breakfast listed', checkIn: 'Confirm times when booking', note: 'Free parking and Wi-Fi, just off I‑87 and I‑90.' },
]

export const costRows = [
  { id: 'motel', label: 'Motel', detail: '1 room, 2 queen beds', low: 60, high: 85 },
  { id: 'gas', label: 'Gas', detail: '', low: 45, high: 60 },
  { id: 'tolls', label: 'Tolls', detail: 'Mass Pike and NY Thruway', low: 15, high: 20 },
  { id: 'skating', label: 'Skate rental', detail: '$5 each; rink entry is free', low: 0, high: 25 },
  { id: 'food', label: 'Food & coffee', detail: '3 casual meals and snacks', low: 150, high: 200 },
] as const
export type CostId = (typeof costRows)[number]['id']

export const packing = [
  { group: 'In the Car', items: ['Ice scraper and snow brush', 'Washer fluid rated for freezing', 'Phone charging cables', 'E-ZPass transponder'] },
  { group: 'To Wear', items: ['Winter jacket', 'Gloves', 'Beanie', 'Thick socks for skating', 'Waterproof boots'] },
  { group: 'From Home', items: ['Snacks', 'Bottled water', 'Breakfast for Day 1', 'Motel confirmation'] },
]

export const credits = [
  ['Silk Road Bridge', 'John Hoey', 'CC BY 2.0', 'Silk Road Bridge (1) (16006845300).jpg'],
  ['Red Lion Inn', 'John Phelan', 'CC BY-SA 4.0', 'Red Lion Inn, 2018, Stockbridge MA.jpg'],
  ['Empire State Plaza', 'Sashimi-b', 'CC BY-SA 4.0', 'Empire State Plaza at sunset.jpg'],
  ['Congress Park', 'Tyler A. McNeil', 'CC BY-SA 4.0', 'Congress Park, Saratoga Springs, New York.jpg'],
  ['Equinox Hotel', 'Rolf Müller', 'CC BY-SA 3.0', 'Equinox Hotel Manchester Village Vermont.jpg'],
  ['Winhall River', 'Shannon', 'CC BY-SA 2.0', 'Winhall River, West River Trail.jpg'],
  ['Bennington Monument', 'King of Hearts', 'CC BY-SA 4.0', 'Bennington Battle Monument October 2021 001.jpg'],
] as const

export const roads = [
  ['Mass511', 'Massachusetts', 'https://mass511.com/'],
  ['511NY', 'New York', 'https://511ny.org/'],
  ['New England 511', 'Vermont', 'https://newengland511.org/'],
] as const

/** Every stop in order, with Brattleboro pinned so Google keeps the VT‑30 return. */
export function directionsUrl(list: Stop[], view: 'all' | 'day1' | 'day2', motelId: string) {
  const motel = motels.find((m) => m.id === motelId) ?? motels[0]
  const day = view === 'all' ? null : view === 'day1' ? 1 : 2
  const places: string[] = day === 2 ? [`${motel.name}, ${motel.address}`] : []
  for (const s of list) {
    if (day && s.day !== day) continue
    if (s.id === 'breakfast') continue
    if (s.id === 'home') places.push('Brattleboro, VT')
    places.push(s.id === 'latham' ? `${motel.name}, ${motel.address}` : s.query)
    if (s.id === 'bennington') places.push('15 Monument Cir, Bennington, VT 05201')
  }
  const q = new URLSearchParams({ api: '1', origin: places[0], destination: places.at(-1)!, travelmode: 'driving' })
  q.set('waypoints', places.slice(1, -1).join('|'))
  return `https://www.google.com/maps/dir/?${q}`
}
