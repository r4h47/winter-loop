import { motels } from '../data/trip'
import { readCosts, type CostState } from './costs'

/* The shared plan lives after # in the link, so it is never sent to a server. */
export type Plan = { costs: CostState; motel: string }

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0)))

export const planLink = (p: Plan) => `${location.origin}${location.pathname}${location.search}#plan=${toB64(JSON.stringify(p))}`

export function planFromHash(): Plan | null {
  const m = /^#plan=([\w-]+)$/.exec(location.hash)
  if (!m) return null
  try {
    const v = JSON.parse(fromB64(m[1])) as { costs?: unknown; motel?: unknown }
    const costs = readCosts(v.costs)
    return costs && { costs, motel: motels.some((x) => x.id === v.motel) ? String(v.motel) : '' }
  } catch {
    return null
  }
}
