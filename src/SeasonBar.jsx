import { useState } from 'react'
import { startSeason, endSeason } from './api.js'
import { defaultSeasonName, MAX_SEASON_NAME } from '../functions/_lib/text.js'

// The season control. Text, not buttons: a season is an occasional thing and
// should not compete with the board or with logging a result.
export default function SeasonBar({ slug, board, scope, onScope, onChanged }) {
  const [mode, setMode] = useState('idle')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const active = board.activeSeason
  const viewing = board.season

  async function run(work) {
    setBusy(true)
    setError(null)
    try {
      await work()
      setMode('idle')
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'starting') {
    return (
      <div className="season-bar season-bar-form">
        {error ? (
          <span className="season-error" role="alert">
            {error}
          </span>
        ) : null}
        <label className="eyebrow" htmlFor="season-name">
          Season name
        </label>
        <div className="season-form-row">
          <input
            id="season-name"
            className="input season-input"
            value={name}
            maxLength={MAX_SEASON_NAME}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => run(() => startSeason(slug, name))}
          >
            {busy ? 'Starting it' : 'Start it'}
          </button>
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setMode('idle')}>
            Not now
          </button>
        </div>
        <span className="season-hint">
          Results logged from now on count toward this season. All-time keeps counting everything.
        </span>
      </div>
    )
  }

  if (mode === 'ending') {
    return (
      <div className="season-bar season-bar-form">
        {error ? (
          <span className="season-error" role="alert">
            {error}
          </span>
        ) : null}
        <span className="season-hint">
          End {active.name}? Whoever is on top keeps the title, and the board goes back to all-time.
        </span>
        <div className="season-form-row">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => run(() => endSeason(slug, active.id))}
          >
            {busy ? 'Ending it' : 'End the season'}
          </button>
          <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => setMode('idle')}>
            Keep it running
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="season-bar">
      {active ? (
        <>
          <span className="season-name">{active.name}</span>
          <button type="button" className="linkish" onClick={() => setMode('ending')}>
            End season
          </button>
        </>
      ) : (
        <button
          type="button"
          className="linkish"
          onClick={() => {
            setName(defaultSeasonName())
            setMode('starting')
          }}
        >
          Start a season
        </button>
      )}

      {/* Which slice is on screen, and the way back to the other one. */}
      {active && scope === 'all' ? (
        <button type="button" className="linkish" onClick={() => onScope(null)}>
          Back to {active.name}
        </button>
      ) : null}
      {active && scope !== 'all' ? (
        <button type="button" className="linkish" onClick={() => onScope('all')}>
          See all time
        </button>
      ) : null}
      {!active && viewing ? (
        <>
          <span className="season-name">{viewing.name}</span>
          <button type="button" className="linkish" onClick={() => onScope('all')}>
            Back to all time
          </button>
        </>
      ) : null}
    </div>
  )
}
