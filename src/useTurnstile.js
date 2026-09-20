import { useCallback, useState } from 'react'
import { useSiteKey } from './useSiteKey.js'

// Shared state for a form that carries a Turnstile token.
//
// onToken and reset are stable, because the widget component re-renders itself
// whenever its callback identity changes and a widget that keeps rebuilding
// never gets solved.
export function useTurnstile() {
  const config = useSiteKey()
  const [token, setToken] = useState(null)
  const [resetSignal, setResetSignal] = useState(0)

  const onToken = useCallback((value) => setToken(value), [])
  const reset = useCallback(() => {
    setToken(null)
    setResetSignal((n) => n + 1)
  }, [])

  const configured = config.status === 'ok' && Boolean(config.siteKey)
  return {
    config,
    token,
    onToken,
    resetSignal,
    reset,
    // The form can only be submitted once the check has actually passed.
    ready: configured && Boolean(token),
    usable: config.status === 'loading' || configured,
  }
}
