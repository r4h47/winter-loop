import { useState, type FormEvent } from 'react'
import { Check, Copy, LoaderCircle, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { costRows, type CostId } from '../data/trip'
import { GROUP, levels, MAX, name as nameOf, planRange, preset, sharers, tally, toCents, type CostState, type Receipt } from '../lib/costs'
import { useCopy } from '../lib/hooks'
import { usd, usd2 } from '../lib/money'

type Update = (f: (c: CostState) => CostState) => void
type Props = { costs: CostState; setCosts: Update; miles: number }

function SharePicker({ costs, shared, onChange, label }: { costs: CostState; shared: boolean[]; onChange: (v: boolean[]) => void; label: string }) {
  const on = sharers(shared, costs.people)
  return (
    <div className="share-grid" role="group" aria-label={`Who shared ${label}`}>
      {Array.from({ length: costs.people }, (_, i) => (
        <label className="check" key={i}>
          <input type="checkbox" name={`share-${label}`} value={i} checked={on.includes(i)} disabled={on.length === 1 && on[0] === i} onChange={() => onChange(Array.from({ length: MAX }, (_, j) => (j < costs.people ? (j === i ? !on.includes(j) : on.includes(j)) : shared[j])))} />
          <span>{nameOf(costs, i)}</span>
        </label>
      ))}
    </div>
  )
}

function Payers({ costs, value, onChange, label, id }: { costs: CostState; value: number; onChange: (n: number) => void; label: string; id?: string }) {
  return (
    <select id={id} name={`payer-${label}`} aria-label={id ? undefined : `${label}, paid by`} autoComplete="off" value={Math.min(value, costs.people - 1)} onChange={(e) => onChange(Number(e.target.value))}>
      {Array.from({ length: costs.people }, (_, i) => <option key={i} value={i}>{nameOf(costs, i)}</option>)}
    </select>
  )
}

export function Costs({ costs, setCosts, miles }: Props) {
  const { state, copy } = useCopy()
  const { people, mode } = costs
  const name = (i: number) => nameOf(costs, i)
  const { rows, owes, total, moves } = tally(costs)
  const range = planRange(miles, costs.beds)
  const level = levels.find(([l]) => { const p = preset(l, miles, costs.beds); return costRows.every((r) => p[r.id] === costs.amounts[r.id]) })?.[0]
  const even = Math.max(...owes) - Math.min(...owes) <= costRows.length
  const setPeople = (d: number) => setCosts((c) => ({ ...c, people: Math.max(1, Math.min(MAX, c.people + d)) }))
  const row = (id: CostId) => rows[costRows.findIndex((r) => r.id === id)]

  const summary = [
    `Winter Loop ${mode === 'plan' ? 'estimate' : 'actual costs'}: ${usd2(total / 100)} total`,
    ...rows.map((r) => `${r.label}: ${usd2(r.cents / 100)}, paid by ${name(r.payer)}${r.who.length < people ? `, shared by ${r.who.map(name).join(', ')}` : ''}`),
    '',
    'Shares:',
    ...owes.map((n, i) => `${name(i)}: ${usd2(n / 100)}`),
    '',
    'Who owes whom:',
    ...(moves.length ? [] : ['Everyone is even.']),
    ...moves.map((m) => `${name(m.from)} pays ${name(m.to)} ${usd2(m.amount / 100)}`),
  ].join('\n')

  return (
    <section id="costs" className="section" aria-labelledby="costs-h" tabIndex={-1}>
      <div className="wrap">
        <h2 id="costs-h">Cost Splitter</h2>
        <div className="cost-grid">
          <div className="cost-main">
            <div className="cost-modes">
              <div className="chips" role="group" aria-label="Estimate or actual costs">
                {([['plan', 'Estimate'], ['actual', 'Actual']] as const).map(([m, t]) => <button key={m} type="button" className="chip" aria-pressed={mode === m} onClick={() => setCosts((c) => ({ ...c, mode: m }))}>{t}</button>)}
              </div>
              {mode === 'plan' && (
                <div className="chips" role="group" aria-label="Fill in plan estimates">
                  {levels.map(([l, t]) => (
                    <button key={l} type="button" className="chip" aria-pressed={level === l} onClick={() => setCosts((c) => ({ ...c, amounts: preset(l, miles, c.beds) }))}>{t}</button>
                  ))}
                </div>
              )}
            </div>
            {mode === 'plan' ? (
              <table className="cost-table">
                <thead><tr><th scope="col">Expense</th><th scope="col">Group total</th><th scope="col">Paid By</th><th scope="col" className="r">Each</th></tr></thead>
                <tbody>
                  {costRows.map((r) => {
                    const who = row(r.id).who
                    return (
                      <tr key={r.id}>
                        <th scope="row">
                          <span>{r.label}</span>
                          <small className="num">{r.id === 'gas' ? `${Math.round(miles)} miles on this route` : r.id === 'motel' ? (costs.beds === 'two' ? '2 rooms' : '1 room plus an extra bed') : r.detail}</small>
                          <details className="share">
                            <summary>{who.length === people ? `Shared by all ${people}` : `Shared by ${who.length} of ${people}`}</summary>
                            <SharePicker costs={costs} shared={costs.shared[r.id]} label={r.label} onChange={(v) => setCosts((c) => ({ ...c, shared: { ...c.shared, [r.id]: v } }))} />
                          </details>
                        </th>
                        <td>
                          <span className="money"><i aria-hidden="true">$</i><input className="num" type="number" inputMode="decimal" min="0" max="99999" step="any" name={`cost-${r.id}`} autoComplete="off" aria-label={`${r.label}, group total in dollars`} value={costs.amounts[r.id]} onChange={(e) => { const v = e.target.value; setCosts((c) => ({ ...c, amounts: { ...c.amounts, [r.id]: v } })) }} /></span>
                        </td>
                        <td><Payers costs={costs} label={r.label} value={costs.payers[r.id]} onChange={(v) => setCosts((c) => ({ ...c, payers: { ...c.payers, [r.id]: v } }))} /></td>
                        <td className="r num">{usd2(toCents(costs.amounts[r.id]) / who.length / 100)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : <Receipts costs={costs} setCosts={setCosts} />}
            <fieldset className="names">
              <legend>Group Roster</legend>
              <div className="stepper">
                <button type="button" className="icon-btn outline" aria-label="Remove a traveler" disabled={people <= 1} onClick={() => setPeople(-1)}><Minus size={16} aria-hidden="true" /></button>
                <output className="num">{people} {people === 1 ? 'person' : 'people'}</output>
                <button type="button" className="icon-btn outline" aria-label="Add a traveler" disabled={people >= MAX} onClick={() => setPeople(1)}><Plus size={16} aria-hidden="true" /></button>
              </div>
              <div className="name-grid">
                {Array.from({ length: people }, (_, i) => (
                  <input key={i} type="text" name={`traveler-${i + 1}`} aria-label={`Name of traveler ${i + 1}`} autoComplete="off" spellCheck={false} maxLength={24} placeholder={`Traveler ${i + 1}…`} value={costs.names[i]} onChange={(e) => { const v = e.target.value; setCosts((c) => ({ ...c, names: c.names.map((n, j) => (j === i ? v : n)) })) }} />
                ))}
              </div>
              <p className="hint">Names and costs stay in this browser. Share Trip copies a link that carries them to the group.</p>
            </fieldset>
          </div>
          <aside className="tally" aria-label="Split summary">
            <p className="tally-each num" aria-live="polite"><b>{usd2(total / people / 100)}</b><span>{even ? 'per person' : 'average'}</span></p>
            <p className="tally-row num"><span>{mode === 'plan' ? 'Estimated total' : 'Spent so far'}</span><span>{usd2(total / 100)}</span></p>
            <p className="tally-row num"><span>Plan range for {GROUP} people</span><span>{usd(range.low)}–{usd(range.high)}</span></p>
            {!even && owes.map((n, i) => <p className="tally-row num" key={i}><span>{name(i)}’s share</span><span>{usd2(n / 100)}</span></p>)}
            <h3>Who Owes Whom</h3>
            {moves.length ? (
              <ul className="moves">{moves.map((m) => <li key={`${m.from}-${m.to}`}><span>{name(m.from)} pays {name(m.to)}</span><b className="num">{usd2(m.amount / 100)}</b></li>)}</ul>
            ) : <p className="muted">Everyone is even.</p>}
            <button type="button" className="btn-primary wide" disabled={state === 'pending'} onClick={() => copy(summary)}>
              {state === 'pending' ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : state === 'done' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              {state === 'pending' ? 'Copying…' : state === 'done' ? 'Breakdown Copied' : 'Copy Breakdown'}
            </button>
            <p className="error" role="status">{state === 'error' ? 'Copying is blocked here. Allow clipboard access and try again.' : ''}</p>
          </aside>
        </div>
      </div>
    </section>
  )
}

const all = () => Array.from({ length: MAX }, () => true)

function Receipts({ costs, setCosts }: { costs: CostState; setCosts: Update }) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [payer, setPayer] = useState(0)
  const [shared, setShared] = useState(all)
  const [error, setError] = useState<{ field: 'label' | 'amount'; text: string } | null>(null)
  const [gone, setGone] = useState<Receipt | null>(null)

  const add = (e: FormEvent) => {
    e.preventDefault()
    const bad = !label.trim() ? { field: 'label' as const, text: 'Name the expense, such as Dinner.' } : !toCents(amount) ? { field: 'amount' as const, text: 'Enter an amount above $0.' } : null
    setError(bad)
    if (bad) {
      document.getElementById(`receipt-${bad.field}`)?.focus()
      return
    }
    const r: Receipt = { id: `${Date.now()}-${costs.receipts.length}`, label: label.trim(), amount, payer: Math.min(payer, costs.people - 1), shared }
    setCosts((c) => ({ ...c, receipts: [...c.receipts, r] }))
    setLabel('')
    setAmount('')
    setShared(all())
    setGone(null)
  }

  return (
    <div className="receipts">
      {costs.receipts.length ? (
        <ul className="receipt-list">
          {costs.receipts.map((r) => {
            const who = sharers(r.shared, costs.people)
            return (
              <li key={r.id}>
                <div><b>{r.label}</b><small>{nameOf(costs, Math.min(r.payer, costs.people - 1))} paid, {who.length === costs.people ? `split ${who.length} ways` : `for ${who.map((i) => nameOf(costs, i)).join(', ')}`}</small></div>
                <b className="num">{usd2(toCents(r.amount) / 100)}</b>
                <button type="button" className="icon-btn plain" aria-label={`Remove ${r.label}`} onClick={() => { setGone(r); setCosts((c) => ({ ...c, receipts: c.receipts.filter((x) => x.id !== r.id) })) }}><X size={16} aria-hidden="true" /></button>
              </li>
            )
          })}
        </ul>
      ) : <p className="cond-note">No receipts yet. Add the first one below.</p>}
      {gone && <button type="button" className="text-btn" onClick={() => { setCosts((c) => ({ ...c, receipts: [...c.receipts, gone] })); setGone(null) }}><RotateCcw size={16} aria-hidden="true" />Undo Remove {gone.label}</button>}
      <form onSubmit={add} noValidate className="receipt-form">
        <div>
          <label htmlFor="receipt-label">Expense</label>
          <input id="receipt-label" name="receipt-label" type="text" autoComplete="off" maxLength={40} placeholder="Dinner in Colonie…" value={label} aria-invalid={error?.field === 'label'} aria-describedby="receipt-error" onChange={(e) => { setLabel(e.target.value); setError(null) }} />
        </div>
        <div>
          <label htmlFor="receipt-amount">Amount</label>
          <span className="money"><i aria-hidden="true">$</i><input className="num" id="receipt-amount" name="receipt-amount" type="number" inputMode="decimal" min="0" max="99999" step="any" autoComplete="off" value={amount} aria-invalid={error?.field === 'amount'} aria-describedby="receipt-error" onChange={(e) => { setAmount(e.target.value); setError(null) }} /></span>
        </div>
        <div>
          <label htmlFor="receipt-payer">Paid By</label>
          <Payers costs={costs} id="receipt-payer" label="receipt" value={payer} onChange={setPayer} />
        </div>
        <div className="receipt-share"><span className="muted">Shared by</span><SharePicker costs={costs} shared={shared} label="this receipt" onChange={setShared} /></div>
        <p id="receipt-error" className="error" role="alert">{error?.text ?? ''}</p>
        <button type="submit" className="btn-secondary"><Plus size={16} aria-hidden="true" />Add Receipt</button>
      </form>
    </div>
  )
}
