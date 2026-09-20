import { useEffect, useRef, useState } from 'react'

// The Cloudflare Turnstile widget, rendered explicitly so the component owns
// the widget's lifetime and can reset it.
//
// A token is good for one submission. Any failed attempt, whether it was the
// check itself or something further down, has to run the widget again, which is
// what resetSignal is for.

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = SCRIPT_URL
      el.async = true
      el.defer = true
      el.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('no widget')))
      el.onerror = () => {
        scriptPromise = null
        reject(new Error('blocked'))
      }
      document.head.appendChild(el)
    })
  }
  return scriptPromise
}

export default function Turnstile({ siteKey, onToken, resetSignal = 0, label }) {
  const holder = useRef(null)
  const widgetId = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let live = true
    loadTurnstile()
      .then((turnstile) => {
        if (!live || !holder.current) return
        widgetId.current = turnstile.render(holder.current, {
          sitekey: siteKey,
          // Matches the app, which follows the system setting.
          theme: 'auto',
          callback: (token) => {
            setStatus('ready')
            onToken(token)
          },
          'expired-callback': () => {
            setStatus('expired')
            onToken(null)
          },
          'error-callback': () => {
            setStatus('failed')
            onToken(null)
            return true
          },
        })
        setStatus((current) => (current === 'loading' ? 'waiting' : current))
      })
      .catch(() => live && setStatus('blocked'))

    return () => {
      live = false
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [siteKey, onToken])

  // Spend a token, get a new one.
  useEffect(() => {
    if (!resetSignal || !widgetId.current || !window.turnstile) return
    window.turnstile.reset(widgetId.current)
    setStatus('waiting')
    onToken(null)
  }, [resetSignal, onToken])

  return (
    <div className="check">
      <span className="eyebrow">{label}</span>
      <div ref={holder} className="check-widget" />
      {status === 'loading' ? <span className="check-note">Loading the browser check.</span> : null}
      {status === 'waiting' ? <span className="check-note">Waiting on the browser check.</span> : null}
      {status === 'expired' ? (
        <span className="check-note">That check timed out. It is running again.</span>
      ) : null}
      {status === 'failed' ? (
        <span className="check-note check-note-error" role="alert">
          The browser check did not pass. It is running again.
        </span>
      ) : null}
      {status === 'blocked' ? (
        <span className="check-note check-note-error" role="alert">
          The browser check could not load, so nothing can be saved from here. An ad or script
          blocker is the usual cause.
        </span>
      ) : null}
    </div>
  )
}
