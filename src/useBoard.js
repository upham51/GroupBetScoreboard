import { useCallback, useEffect, useState } from 'react'
import { fetchBoard } from './api.js'

// The HTML shell inlines the board it already fetched so the first paint shows
// real standings. It is read once and then dropped: after somebody logs a
// result it is stale, and a remount must not resurrect it.
function takeInjected() {
  const el = document.getElementById('board-state')
  if (!el) return null
  el.remove()
  try {
    return JSON.parse(el.textContent)
  } catch {
    return null
  }
}

let injected = null
let injectedRead = false

function injectedFor(slug) {
  if (!injectedRead) {
    injected = takeInjected()
    injectedRead = true
  }
  if (!injected || injected.slug !== slug) return null
  const state = injected
  injected = null
  return state
}

function initialState(slug) {
  const state = injectedFor(slug)
  if (state?.status === 'ok' && state.board) return { status: 'ok', board: state.board }
  if (state?.status === 'missing') return { status: 'missing' }
  if (state?.status === 'error') {
    return { status: 'error', message: 'The board could not be read just now. Nothing is lost, try again.' }
  }
  return { status: 'loading' }
}

export function useBoard(slug) {
  const [state, setState] = useState(() => initialState(slug))

  const reload = useCallback(async () => {
    try {
      const board = await fetchBoard(slug)
      setState({ status: 'ok', board })
    } catch (err) {
      if (err.status === 404) setState({ status: 'missing' })
      else setState({ status: 'error', message: err.message })
    }
  }, [slug])

  useEffect(() => {
    const next = initialState(slug)
    setState(next)
    if (next.status === 'loading') reload()
  }, [slug, reload])

  return { ...state, reload }
}
