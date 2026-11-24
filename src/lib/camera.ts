import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react'

export type Frame = { k: number; x: number; y: number }
type Cam = { z: number; cx: number; cy: number }
const MIN = 0.75
const MAX = 16
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

/**
 * Zoom and pan on top of an automatic framing. The camera keeps a centre in map units,
 * so it survives resizes, and drops back to the automatic frame when `scene` changes.
 */
export function useCamera(box: RefObject<HTMLDivElement | null>, fit: Frame | null, size: { w: number; h: number }, scene: string, focus: readonly number[]) {
  const [state, setState] = useState<{ scene: string; cam: Cam } | null>(null)
  const [dragging, setDragging] = useState(false)
  const cam = state?.scene === scene ? state.cam : null
  const { w, h } = size

  const frame: Frame | null = fit && cam ? { k: fit.k * cam.z, x: w / 2 - fit.k * cam.z * cam.cx, y: h / 2 - fit.k * cam.z * cam.cy } : fit

  // Event handlers read the newest values without re-subscribing.
  const live = useRef({ fit, frame, w, h, z: cam?.z ?? 1, scene })
  useEffect(() => {
    live.current = { fit, frame, w, h, z: cam?.z ?? 1, scene }
  })

  const set = useCallback((z: number, cx: number, cy: number) => {
    setState({ scene: live.current.scene, cam: { z: clamp(z, MIN, MAX), cx: clamp(cx, 100, 1450), cy: clamp(cy, 150, 950) } })
  }, [])

  /** Scales by `by`, keeping the map point under (px, py) in place. */
  const zoomAt = useCallback((by: number, px?: number, py?: number) => {
    const v = live.current
    if (!v.fit || !v.frame) return
    const x = px ?? v.w / 2
    const y = py ?? v.h / 2
    const z = clamp(v.z * by, MIN, MAX)
    const mx = (x - v.frame.x) / v.frame.k
    const my = (y - v.frame.y) / v.frame.k
    const k = v.fit.k * z
    set(z, mx - (x - v.w / 2) / k, my - (y - v.h / 2) / k)
  }, [set])

  const panBy = useCallback((dx: number, dy: number) => {
    const v = live.current
    if (!v.frame) return
    set(v.z, (v.w / 2 - v.frame.x - dx) / v.frame.k, (v.h / 2 - v.frame.y - dy) / v.frame.k)
  }, [set])

  /** Buttons and keys: the first zoom in heads for whatever is selected instead of empty map. */
  const step = (by: number) => {
    if (by > 1 && !cam) set(by, focus[0], focus[1])
    else zoomAt(by)
  }

  const reset = useCallback(() => setState(null), [])

  // Ctrl or Cmd plus wheel, and trackpad pinch. A plain wheel still scrolls the page.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(Math.exp(-clamp(e.deltaY, -60, 60) * 0.008), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [box, zoomAt])

  const touches = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(false)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as Element).closest('.zoom')) return
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    moved.current = false
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const was = touches.current.get(e.pointerId)
    if (!was) return
    const all = touches.current
    const now = { x: e.clientX, y: e.clientY }
    if (all.size === 1) {
      const far = Math.hypot(now.x - was.x, now.y - was.y)
      if (!moved.current && far < 5) return
      // One finger scrolls the page until the map is zoomed in.
      if (e.pointerType !== 'mouse' && live.current.z <= 1 && !moved.current) return
      if (!moved.current) e.currentTarget.setPointerCapture(e.pointerId)
      moved.current = true
      setDragging(true)
      panBy(now.x - was.x, now.y - was.y)
    } else if (all.size === 2) {
      const other = [...all.entries()].find(([id]) => id !== e.pointerId)![1]
      const r = e.currentTarget.getBoundingClientRect()
      const before = Math.hypot(was.x - other.x, was.y - other.y)
      const after = Math.hypot(now.x - other.x, now.y - other.y)
      moved.current = true
      setDragging(true)
      if (before > 10) zoomAt(after / before, (now.x + other.x) / 2 - r.left, (now.y + other.y) / 2 - r.top)
    }
    all.set(e.pointerId, now)
  }
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    touches.current.delete(e.pointerId)
    if (touches.current.size) return
    setDragging(false)
    setTimeout(() => {
      moved.current = false
    })
  }
  // A drag that ends on a pin must not also press it.
  const onClickCapture = (e: MouseEvent) => {
    if (!moved.current) return
    moved.current = false
    e.preventDefault()
    e.stopPropagation()
  }
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return
    const r = e.currentTarget.getBoundingClientRect()
    zoomAt(2, e.clientX - r.left, e.clientY - r.top)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.ctrlKey || e.metaKey) return
    const act: Record<string, () => void> = {
      '+': () => step(1.6), '=': () => step(1.6), '-': () => step(1 / 1.6), '0': reset,
      ArrowLeft: () => panBy(80, 0), ArrowRight: () => panBy(-80, 0), ArrowUp: () => panBy(0, 80), ArrowDown: () => panBy(0, -80),
    }
    if (!act[e.key]) return
    e.preventDefault()
    act[e.key]()
  }

  const z = cam?.z ?? 1
  return {
    frame, z, dragging, step, reset, moved: !!cam, canIn: z < MAX - 0.01, canOut: z > MIN + 0.01,
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onClickCapture, onDoubleClick, onKeyDown },
  }
}
