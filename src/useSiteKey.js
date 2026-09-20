import { useEffect, useState } from 'react'

// The Turnstile site key lives in the Pages environment rather than the bundle,
// so it is fetched once per page load and shared by both forms.

let cached = null
let inFlight = null

function load() {
  if (cached) return Promise.resolve(cached)
  if (!inFlight) {
    inFlight = fetch('/api/config')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('config'))))
      .then((data) => {
        cached = { siteKey: data.turnstileSiteKey ?? null }
        return cached
      })
      .catch(() => {
        inFlight = null
        throw new Error('config')
      })
  }
  return inFlight
}

export function useSiteKey() {
  const [state, setState] = useState(() => (cached ? { status: 'ok', siteKey: cached.siteKey } : { status: 'loading' }))

  useEffect(() => {
    if (state.status !== 'loading') return undefined
    let live = true
    load()
      .then((config) => live && setState({ status: 'ok', siteKey: config.siteKey }))
      .catch(() => live && setState({ status: 'error' }))
    return () => {
      live = false
    }
  }, [state.status])

  return state
}
