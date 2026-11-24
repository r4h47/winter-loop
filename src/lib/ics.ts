import { departures, motels, type Day, type Depart, type Stop } from '../data/trip'

const esc = (s: string) => s.replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
const bytes = new TextEncoder()

function fold(line: string) {
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (bytes.encode(cur + ch).length > 73) {
      out.push(cur)
      cur = ' '
    }
    cur += ch
  }
  return [...out, cur].join('\r\n')
}

const minutes = (t: string) => {
  const [, h, m, p] = /(\d+):(\d+) (AM|PM)/.exec(t)!
  return (Number(h) % 12 + (p === 'PM' ? 12 : 0)) * 60 + Number(m)
}

/** Eastern Standard Time is UTC-5 on every trip date. */
const stamp = (date: string, t: string) =>
  new Date(Date.parse(`${date}T05:00:00Z`) + minutes(t) * 60e3).toISOString().replace(/[-:]|\.\d+/g, '')

export function buildIcs(stops: Stop[], depart: Depart, motelId: string) {
  const motel = motels.find((m) => m.id === motelId)
  const now = new Date().toISOString().replace(/[-:]|\.\d+/g, '')
  const events = stops.flatMap((s) => {
    const date = departures[depart].iso[s.day - 1]
    const end = s.until === s.time ? s.time.replace(':00', ':15').replace(':30', ':45') : s.until
    const place = s.id === 'latham' || s.id === 'breakfast' ? (motel ? `${motel.name}, ${motel.address}` : 'Motel in Latham or Colonie, NY') : s.query
    const note = [s.leg && `${s.leg.label}, leaving ${s.leg.leave}, ${s.leg.road}.`, s.text, s.booking].filter(Boolean).join('\n')
    return ['BEGIN:VEVENT', `UID:${s.id}-${date}@winter-loop`, `DTSTAMP:${now}`, `DTSTART:${stamp(date, s.time)}`, `DTEND:${stamp(date, end)}`, `SUMMARY:${esc(s.title)}`, `LOCATION:${esc(place)}`, `DESCRIPTION:${esc(note)}`, 'END:VEVENT']
  })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Winter Loop//Trip//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].map(fold).join('\r\n')
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const local = (date: string, t: string) => {
  const n = minutes(t)
  return `${date}T${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}:00-05:00`
}

/** One event per day, listing that day's stops. Google and Outlook links hold a single event each. */
export function dayLinks(stops: Stop[], depart: Depart, motelId: string, day: Day) {
  const list = stops.filter((s) => s.day === day)
  const date = departures[depart].iso[day - 1]
  const motel = motels.find((m) => m.id === motelId)
  const [first, last] = [list[0], list[list.length - 1]]
  const title = `Winter Loop Day ${day}`
  const lodging = motel ? `${motel.name}, ${motel.address}` : 'motel in Latham or Colonie, NY'
  const place = day === 1 ? 'Boston, MA' : lodging
  const body = list.map((s) => `${s.time}${s.until !== s.time ? ` to ${s.until}` : ''}: ${s.title}, ${s.id === 'latham' || s.id === 'breakfast' ? lodging : s.query}`).join('\n')
  const google = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(date, first.time)}/${stamp(date, last.until)}`, location: place, details: body, ctz: 'America/New_York' })
  const outlook = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: title, startdt: local(date, first.time), enddt: local(date, last.until), location: place, body: body.replaceAll('\n', '<br>') })
  // Outlook reads "+" literally, so spaces must be %20.
  return { google: `https://calendar.google.com/calendar/render?${google}`, outlook: `https://outlook.live.com/calendar/0/deeplink/compose?${String(outlook).replaceAll('+', '%20')}` }
}
