import { departures, motels, type Depart, type Stop } from '../data/trip'

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
    const place = (s.id === 'latham' || s.id === 'breakfast') && motel ? `${motel.name}, ${motel.address}` : s.query
    const note = [s.leg && `${s.leg.label}, ${s.leg.road}.`, s.text, s.booking].filter(Boolean).join('\n')
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
