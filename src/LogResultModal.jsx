import { useEffect, useRef, useState } from 'react'
import { IconClose } from './icons.jsx'
import SuccessCheck from './SuccessCheck.jsx'
import PeoplePicker from './PeoplePicker.jsx'
import SideSummary from './SideSummary.jsx'
import TurnstileField from './TurnstileField.jsx'
import { useTurnstile } from './useTurnstile.js'
import { MAX_NOTE, MAX_STAKES } from '../functions/_lib/text.js'

export default function LogResultModal({ roster, onClose, onLogged, onDone }) {
  const [winners, setWinners] = useState([])
  const [losers, setLosers] = useState([])
  const [note, setNote] = useState('')
  const [stakes, setStakes] = useState('')
  // idle -> sending -> done. The board is refreshed while the confirmation is
  // on screen, but the new standings are not applied until the sheet closes, so
  // the rows are seen moving rather than the reorder happening behind the dim.
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const turnstile = useTurnstile()
  const closeRef = useRef(null)

  // The page behind must stay locked for the whole life of the sheet,
  // including while the confirmation is on screen.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Focus and escape-to-close belong to the form only. Once the result is
  // saved there is nothing left to cancel.
  useEffect(() => {
    if (phase !== 'idle') return undefined
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, phase])

  const toggle = (setter, other) => (id) => {
    setter((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
    other((current) => current.filter((x) => x !== id))
  }

  const sided = winners.length > 0 && losers.length > 0
  const ready = sided && turnstile.ready
  const submitting = phase === 'sending'

  async function submit(event) {
    event.preventDefault()
    if (!ready || phase !== 'idle') return
    setPhase('sending')
    setError(null)
    let next
    try {
      next = await onLogged({ winners, losers, note, stakes }, turnstile.token)
    } catch (err) {
      setError(err.message)
      setPhase('idle')
      // The token was spent on that attempt, so the next one needs a fresh one.
      turnstile.reset()
      return
    }
    setPhase('done')
    // Long enough for both strokes to draw, plus a short hold.
    setTimeout(() => onDone(next), 1400)
  }

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (phase === 'idle' && event.target === event.currentTarget) onClose()
      }}
    >
      {phase === 'done' ? (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-grip" aria-hidden="true" />
          <SuccessCheck
            label="Result logged"
            sub="The standings are about to move. Watch the rows."
          />
        </div>
      ) : (
        <form
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-result-title"
          onSubmit={submit}
        >
          <div className="modal-grip" aria-hidden="true" />
          <div className="modal-head">
            <h2 className="modal-title" id="log-result-title">
              Log a result
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="icon-btn icon-btn-close"
              onClick={onClose}
              aria-label="Close without logging"
            >
              <IconClose />
            </button>
          </div>
          <p className="modal-sub">
            Whoever logs it is trusted. Keep it honest, or don&rsquo;t.
          </p>
          {/* The thing people ask the first time more than two names are on a
              result: a side is not a place, it is what the board charges you. */}
          <p className="hint" style={{ marginBottom: 18 }}>
            Everyone you put on the winning side takes a win, everyone on the
            losing side takes a loss, however many that is.
          </p>

          {error ? (
            <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </p>
          ) : null}

          <div className="modal-block">
            <label className="field-label" htmlFor="result-note" style={{ display: 'block', marginBottom: 8 }}>
              What was the bet <span className="field-label-note">optional</span>
            </label>
            <input
              id="result-note"
              className="input"
              type="text"
              value={note}
              maxLength={MAX_NOTE}
              placeholder="Chiefs cover the spread"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <PeoplePicker
            label="Who won"
            hint="pick one or more"
            tone="win"
            people={roster}
            picked={winners}
            blocked={losers}
            onToggle={toggle(setWinners, setLosers)}
          />
          <PeoplePicker
            label="Who lost"
            hint="pick one or more"
            tone="lose"
            people={roster}
            picked={losers}
            blocked={winners}
            onToggle={toggle(setLosers, setWinners)}
          />

          <SideSummary people={roster} winners={winners} losers={losers} />

          {/* Directly under the sides it is about, not stranded past the
              browser check. */}
          <p className="hint" style={{ marginBottom: 18 }}>
            {sided ? 'Everybody has a side. Send it.' : 'Pick at least one on each side.'}
          </p>

          <div className="modal-block">
            <label className="field-label" htmlFor="result-stakes" style={{ display: 'block', marginBottom: 8 }}>
              Stakes <span className="field-label-note">optional</span>
            </label>
            <input
              id="result-stakes"
              className="input input-violet"
              type="text"
              value={stakes}
              maxLength={MAX_STAKES}
              placeholder="Loser buys drinks"
              onChange={(event) => setStakes(event.target.value)}
            />
          </div>

          <div className="modal-block">
            <TurnstileField turnstile={turnstile} />
          </div>

          <div className="modal-foot">
            <button type="button" className="btn btn-quiet" onClick={onClose} disabled={submitting}>
              Close
            </button>
            <button type="submit" className="btn" disabled={!ready || submitting}>
              {submitting ? 'Logging the result' : 'Log the result'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
