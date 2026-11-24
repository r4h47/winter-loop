import { departures, type Day, type Depart } from '../data/trip'

export const toMinutes = (t: string) => {
  const [, h, m, p] = /(\d+):(\d+) (AM|PM)/.exec(t)!
  return (Number(h) % 12 + (p === 'PM' ? 12 : 0)) * 60 + Number(m)
}

export const toTime = (n: number) => {
  const d = ((n % 1440) + 1440) % 1440
  return `${Math.floor(d / 60) % 12 || 12}:${String(d % 60).padStart(2, '0')} ${d < 720 ? 'AM' : 'PM'}`
}

const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

export function easternNow() {
  const p = Object.fromEntries(eastern.formatToParts(new Date()).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

export const tripDayToday = (depart: Depart): Day | null => {
  const i = departures[depart].iso.indexOf(easternNow().date)
  return i === 0 ? 1 : i === 1 ? 2 : null
}
