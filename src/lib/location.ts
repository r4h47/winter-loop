import { useCallback, useEffect, useRef, useState } from 'react'
import { project, type Point } from './plazas'

export type Live =
  | { kind: 'off' }
  | { kind: 'pending' }
  | { kind: 'on'; at: Point; time: number }
  | { kind: 'error'; text: string }

const reason = (e: GeolocationPositionError) =>
  e.code === 1 ? 'Location is blocked. Allow it for this site in your browser settings, then try again.'
    : e.code === 3 ? 'Your phone took too long to find you. Try again with a clear view of the sky.'
      : 'Your location is not available right now. Try again in a moment.'

/** Follows the device while switched on. Positions stay in this page and are never stored or sent. */
export function useLive() {
  const [live, setLive] = useState<Live>({ kind: 'off' })
  const id = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (id.current !== null) navigator.geolocation.clearWatch(id.current)
    id.current = null
    setLive({ kind: 'off' })
  }, [])

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLive({ kind: 'error', text: 'This browser cannot share your location.' })
      return
    }
    if (id.current !== null) navigator.geolocation.clearWatch(id.current)
    setLive({ kind: 'pending' })
    id.current = navigator.geolocation.watchPosition(
      (p) => setLive({ kind: 'on', at: project(p.coords.longitude, p.coords.latitude), time: p.timestamp }),
      (e) => setLive((x) => (x.kind === 'on' && e.code !== 1 ? x : { kind: 'error', text: reason(e) })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }, [])

  useEffect(() => () => {
    if (id.current !== null) navigator.geolocation.clearWatch(id.current)
  }, [])

  return { live, start, stop }
}
