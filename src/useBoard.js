import { useCallback, useEffect, useRef, useState } from 'react'
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

// Whoever is alone at rank one. A tie has nobody on top.
function topOf(board) {
  if (!board || board.resultCount === 0) return null
  const leaders = board.standings.filter((r) => r.rank === 1)
  return leaders.length === 1 ? leaders[0].member_id : null
}

export function useBoard(slug) {
  const [state, setState] = useState(() => initialState(slug))
  // Bumped whenever a fetch brings a different person to the top. The board
  // uses it to replay the gold rule once, marking a real event.
  const [leaderChange, setLeaderChange] = useState(0)
  const previousTop = useRef(undefined)

  const apply = useCallback((board) => {
    const next = topOf(board)
    if (previousTop.current !== undefined && next !== null && next !== previousTop.current) {
      setLeaderChange((n) => n + 1)
    }
    previousTop.current = next
    setState({ status: 'ok', board })
  }, [])

  const reload = useCallback(async () => {
    try {
      apply(await fetchBoard(slug))
    } catch (err) {
      if (err.status === 404) setState({ status: 'missing' })
      else setState({ status: 'error', message: err.message })
    }
  }, [slug, apply])

  useEffect(() => {
    const next = initialState(slug)
    if (next.status === 'ok') {
      // Seed the leader tracker from the inlined board without counting it as a
      // change, so arriving on a board never plays the animation.
      previousTop.current = topOf(next.board)
      setState(next)
      return
    }
    setState(next)
    reload()
  }, [slug, reload])

  return { ...state, reload, apply, leaderChange }
}
