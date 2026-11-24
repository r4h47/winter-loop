import { costRows, type CostId } from '../data/trip'
import { settleBalances } from './money'

export type Beds = 'two' | 'one'
export type Receipt = { id: string; label: string; amount: string; payer: number; shared: boolean[] }
export type CostState = {
  people: number
  names: string[]
  amounts: Record<CostId, string>
  payers: Record<CostId, number>
  shared: Record<CostId, boolean[]>
  receipts: Receipt[]
  mode: 'plan' | 'actual'
  beds: Beds
}
export type Level = 'low' | 'mid' | 'high'
export const MAX = 6
export const GROUP = 5
export const levels: [Level, string][] = [['low', 'Plan Low'], ['mid', 'Midpoint'], ['high', 'Plan High']]

/** Gas was priced for 430 miles and the motel for one room; scale both to the current choice. */
export const bounds = (id: CostId, miles: number, beds: Beds) => {
  const r = costRows.find((x) => x.id === id)!
  const k = id === 'gas' ? miles / 430 : id === 'motel' && beds === 'two' ? 2 : 1
  return { low: Math.round(r.low * k), high: Math.round(r.high * k) }
}
export const planRange = (miles: number, beds: Beds) =>
  costRows.reduce((a, r) => { const b = bounds(r.id, miles, beds); return { low: a.low + b.low, high: a.high + b.high } }, { low: 0, high: 0 })

const perRow = <T,>(f: (id: CostId) => T) => Object.fromEntries(costRows.map((r) => [r.id, f(r.id)])) as Record<CostId, T>

export const preset = (l: Level, miles: number, beds: Beds) =>
  perRow((id) => { const b = bounds(id, miles, beds); return String(l === 'mid' ? (b.low + b.high) / 2 : b[l]) })

const everyone = () => Array.from({ length: MAX }, () => true)

export const defaultCosts: CostState = {
  people: GROUP,
  names: Array.from({ length: MAX }, (_, i) => `Traveler ${i + 1}`),
  amounts: preset('high', 430, 'two'),
  payers: { motel: 0, gas: 1, tolls: 2, skating: 3, food: 4 },
  shared: perRow(everyone),
  receipts: [],
  mode: 'plan',
  beds: 'two',
}

const bools = (v: unknown): v is boolean[] => Array.isArray(v) && v.length === MAX && v.every((x) => typeof x === 'boolean')
const seat = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < MAX

/** Accepts saved or shared data from any version of the site; returns null when it is unusable. */
export function readCosts(v: unknown): CostState | null {
  if (typeof v !== 'object' || v === null) return null
  const c = v as Partial<CostState>
  if (!Number.isInteger(c.people) || c.people! < 1 || c.people! > MAX) return null
  if (!Array.isArray(c.names) || c.names.length !== MAX || !c.names.every((n) => typeof n === 'string')) return null
  if (!costRows.every((r) => typeof c.amounts?.[r.id] === 'string' && seat(c.payers?.[r.id]))) return null
  return {
    people: c.people!,
    names: c.names.map((n) => n.slice(0, 24)),
    amounts: perRow((id) => c.amounts![id].slice(0, 10)),
    payers: perRow((id) => c.payers![id]),
    shared: perRow((id) => (bools(c.shared?.[id]) ? c.shared![id] : everyone())),
    receipts: (Array.isArray(c.receipts) ? c.receipts : [])
      .filter((r) => r && typeof r.id === 'string' && typeof r.label === 'string' && typeof r.amount === 'string' && seat(r.payer) && bools(r.shared))
      .slice(0, 60),
    mode: c.mode === 'actual' ? 'actual' : 'plan',
    beds: c.beds === 'two' ? 'two' : 'one',
  }
}
export const isCosts = (v: unknown): v is CostState => readCosts(v) !== null

export const toCents = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(n, 99999) * 100) : 0
}

export const name = (c: CostState, i: number) => c.names[i].trim() || `Traveler ${i + 1}`

export const sharers = (shared: boolean[], people: number) => {
  const on = shared.slice(0, people).flatMap((x, i) => (x ? [i] : []))
  return on.length ? on : Array.from({ length: people }, (_, i) => i)
}

/** Splits every item among the people who shared it, in whole cents. */
export function tally(c: CostState) {
  const items = c.mode === 'plan'
    ? costRows.map((r) => ({ label: r.label as string, cents: toCents(c.amounts[r.id]), payer: c.payers[r.id], shared: c.shared[r.id] }))
    : c.receipts.map((r) => ({ label: r.label, cents: toCents(r.amount), payer: r.payer, shared: r.shared }))
  const owes = Array.from({ length: c.people }, () => 0)
  const paid = Array.from({ length: c.people }, () => 0)
  const rows = items.map((x, n) => {
    const payer = Math.min(x.payer, c.people - 1)
    const who = sharers(x.shared, c.people)
    const base = Math.floor(x.cents / who.length)
    const extra = x.cents - base * who.length
    who.forEach((p, k) => { owes[p] += base + ((k + n) % who.length < extra ? 1 : 0) })
    paid[payer] += x.cents
    return { ...x, payer, who }
  })
  return { rows, owes, total: paid.reduce((a, b) => a + b, 0), moves: settleBalances(paid.map((p, i) => p - owes[i])) }
}

/** Moves an untouched gas estimate to the new route; a typed amount is left alone. */
export const syncGas = (c: CostState, miles: number, known: number[]): CostState => {
  const level = levels.map(([l]) => l).find((l) => known.some((m) => preset(l, m, c.beds).gas === c.amounts.gas))
  const gas = level && preset(level, miles, c.beds).gas
  return gas && gas !== c.amounts.gas ? { ...c, amounts: { ...c.amounts, gas } } : c
}

export const withBeds = (c: CostState, beds: Beds): CostState => {
  if (c.beds === beds) return c
  const motel = toCents(c.amounts.motel) / 100
  return { ...c, beds, amounts: { ...c.amounts, motel: String(beds === 'two' ? motel * 2 : motel / 2) } }
}
