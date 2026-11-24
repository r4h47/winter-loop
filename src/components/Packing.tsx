import { useState, type FormEvent } from 'react'
import { Plus, RotateCcw, X } from 'lucide-react'
import { packing } from '../data/trip'
import { useStored } from '../lib/hooks'

type State = { done: string[]; custom: string[] }
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')
const valid = (v: unknown): v is State => typeof v === 'object' && v !== null && strings((v as State).done) && strings((v as State).custom)

export function Packing() {
  const [state, setState] = useStored<State>('winter-loop:packing', { done: [], custom: [] }, valid)
  const [undo, setUndo] = useState<State | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const groups = [...packing, ...(state.custom.length ? [{ group: 'Your Additions', items: state.custom }] : [])]
  const all = groups.flatMap((g) => g.items)
  const done = all.filter((i) => state.done.includes(i)).length

  const toggle = (i: string) => {
    setUndo(null)
    setState((s) => ({ ...s, done: s.done.includes(i) ? s.done.filter((x) => x !== i) : [...s.done, i] }))
  }
  const add = (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim()
    const problem = !v ? 'Type an item to add.' : all.some((i) => i.toLowerCase() === v.toLowerCase()) ? 'That item is already on the list.' : ''
    setError(problem)
    if (problem) {
      document.getElementById('add-item')?.focus()
      return
    }
    setUndo(null)
    setState((s) => ({ ...s, custom: [...s.custom, v] }))
    setText('')
  }
  const remove = (i: string) => {
    setUndo(state)
    setState((s) => ({ done: s.done.filter((x) => x !== i), custom: s.custom.filter((x) => x !== i) }))
  }

  return (
    <section id="packing" className="section soft" aria-labelledby="packing-h" tabIndex={-1}>
      <div className="wrap">
        <div className="head-row">
          <h2 id="packing-h">Packing Checklist</h2>
          <p className="num" aria-live="polite"><b>{done} of {all.length}</b> packed</p>
        </div>
        <div className="bar" aria-hidden="true"><span style={{ transform: `scaleX(${all.length ? done / all.length : 0})` }} /></div>
        <div className="pack-grid">
          {groups.map((g) => (
            <fieldset key={g.group}>
              <legend>{g.group}</legend>
              <ul>
                {g.items.map((i) => (
                  <li key={i}>
                    <label className="check">
                      <input type="checkbox" checked={state.done.includes(i)} onChange={() => toggle(i)} name="packed" value={i} />
                      <span>{i}</span>
                    </label>
                    {state.custom.includes(i) && <button type="button" className="icon-btn plain" aria-label={`Remove ${i}`} onClick={() => remove(i)}><X size={16} aria-hidden="true" /></button>}
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </div>
        <div className="pack-foot">
          <form onSubmit={add} noValidate>
            <label htmlFor="add-item">Add an item</label>
            <div className="add-row">
              <input id="add-item" name="item" type="text" autoComplete="off" maxLength={60} placeholder="Hand warmers…" value={text} aria-invalid={!!error} aria-describedby="add-error" onChange={(e) => { setText(e.target.value); setError('') }} />
              <button type="submit" className="btn-secondary"><Plus size={16} aria-hidden="true" />Add Item</button>
            </div>
            <p id="add-error" className="error" role="alert">{error}</p>
          </form>
          <div className="pack-reset">
            {undo ? (
              <button type="button" className="text-btn" onClick={() => { setState(undo); setUndo(null) }}><RotateCcw size={16} aria-hidden="true" />Undo Last Change</button>
            ) : (
              <button type="button" className="text-btn" disabled={!done} onClick={() => { setUndo(state); setState((s) => ({ ...s, done: [] })) }}><RotateCcw size={16} aria-hidden="true" />Uncheck All</button>
            )}
            <span className="muted">Saved in this browser only</span>
          </div>
        </div>
      </div>
    </section>
  )
}
