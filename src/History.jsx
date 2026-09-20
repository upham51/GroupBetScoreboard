import { useCallback, useEffect, useState } from 'react'
import { fetchHistory, restoreResult, restoreMember } from './api.js'
import { timeAgo } from './format.js'

const WHAT = { result: 'Result', bet: 'Bet', member: 'Person' }

// Everything that has been removed from this board, with a way back.
//
// There is no login here, so anybody can remove anything. What keeps that
// workable is that nothing is destroyed and every removal is on this list with
// roughly where it came from.
export default function History({ slug, onRestored, onFlash }) {
  const [state, setState] = useState({ status: 'loading' })
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchHistory(slug)
      setState({ status: 'ok', items: data.items })
    } catch (err) {
      setState({ status: 'error', message: err.message })
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  async function restore(item) {
    setBusyId(item.id)
    setError(null)
    try {
      if (item.kind === 'member') await restoreMember(slug, item.id)
      else await restoreResult(slug, item.id)
      await load()
      await onRestored()
      onFlash?.(`${item.label} is back on the board.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="state" aria-busy="true">
        <span className="state-title">Loading the history.</span>
        <span className="skeleton-bar" style={{ display: 'block', width: '64%', marginTop: 6 }} />
        <span className="skeleton-bar" style={{ display: 'block', width: '44%' }} />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="state state-error" role="alert">
        <span className="state-title">The history could not be read.</span>
        <p className="state-body">{state.message} Nothing was removed or restored.</p>
        <p className="state-body">
          <button type="button" className="linkish" onClick={load}>
            Try again
          </button>
        </p>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="state">
        <span className="state-title">Nothing has been removed.</span>
        <p className="state-body">
          Anything taken off the board shows up here, with a way to put it back.
        </p>
      </div>
    )
  }

  return (
    <>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="history-list">
        {state.items.map((item, i) => (
          <li
            key={`${item.kind}-${item.id}`}
            className="history-item"
            style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}
          >
            <span className={`history-kind history-kind-${item.kind}`}>{WHAT[item.kind]}</span>
            <span className="history-main">
              <span className="history-label">{item.label}</span>
              <span className="history-when">
                Removed {timeAgo(item.hidden_at)}
                {item.place ? ` from ${item.place}` : ''}
              </span>
            </span>
            <button
              type="button"
              className="history-restore"
              onClick={() => restore(item)}
              disabled={busyId === item.id}
            >
              {busyId === item.id ? 'Restoring' : 'Restore'}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
