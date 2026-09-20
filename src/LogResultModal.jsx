import { useEffect, useRef, useState } from 'react'
import { IconClose, IconTick } from './icons.jsx'
import SuccessCheck from './SuccessCheck.jsx'
import TurnstileField from './TurnstileField.jsx'
import { useTurnstile } from './useTurnstile.js'

const MAX_NOTE = 120

function Side({ label, hint, roster, picked, blocked, onToggle }) {
  return (
    <div className="field">
      <span className="eyebrow field-label">
        {label} <span className="field-label-note">{hint}</span>
      </span>
      <div className="chips">
        {roster.map((member) => {
          const isPicked = picked.includes(member.id)
          const isBlocked = !isPicked && blocked.includes(member.id)
          return (
            <button
              key={member.id}
              type="button"
              className="chip"
              aria-pressed={isPicked}
              disabled={isBlocked}
              title={isBlocked ? `${member.name} is already on the other side.` : undefined}
              onClick={() => onToggle(member.id)}
            >
              {isPicked ? <IconTick className="chip-tick" /> : null}
              {member.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LogResultModal({ roster, onClose, onLogged, onDone }) {
  const [winners, setWinners] = useState([])
  const [losers, setLosers] = useState([])
  const [note, setNote] = useState('')
  // idle -> sending -> done. The board is refreshed while the confirmation is
  // on screen, but the new standings are not applied until the modal closes, so
  // the rows are seen moving rather than the reorder happening behind the dim.
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const turnstile = useTurnstile()
  const closeRef = useRef(null)

  // The page behind must stay locked for the whole life of the modal,
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

  const toggle = (setter) => (id) =>
    setter((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const ready = winners.length > 0 && losers.length > 0 && turnstile.ready
  const submitting = phase === 'sending'

  async function submit(event) {
    event.preventDefault()
    if (!ready || phase !== 'idle') return
    setPhase('sending')
    setError(null)
    let next
    try {
      next = await onLogged({ winners, losers, note }, turnstile.token)
    } catch (err) {
      setError(err.message)
      setPhase('idle')
      // The token was spent on that attempt, so the next one needs a fresh one.
      turnstile.reset()
      return
    }
    setPhase('done')
    // Long enough for both strokes to draw, plus a short hold.
    setTimeout(() => onDone(next), 1100)
  }

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (phase === 'idle' && event.target === event.currentTarget) onClose()
      }}
    >
      {phase === 'done' ? (
        <div className="modal modal-done" role="dialog" aria-modal="true">
          <SuccessCheck label="Result logged" />
        </div>
      ) : (
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-result-title"
        onSubmit={submit}
      >
        <div className="modal-head">
          <h2 className="modal-title" id="log-result-title">
            Log a result
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close without logging">
            <IconClose />
          </button>
        </div>
        <p className="modal-sub">Whoever logs it is trusted, so keep it honest.</p>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <Side
          label="Who won"
          hint="pick one or more"
          roster={roster}
          picked={winners}
          blocked={losers}
          onToggle={toggle(setWinners)}
        />
        <Side
          label="Who lost"
          hint="pick one or more"
          roster={roster}
          picked={losers}
          blocked={winners}
          onToggle={toggle(setLosers)}
        />

        <div className="field">
          <label className="eyebrow field-label" htmlFor="result-note">
            Note <span className="field-label-note">optional</span>
          </label>
          <input
            id="result-note"
            className="input"
            type="text"
            value={note}
            maxLength={MAX_NOTE}
            placeholder="What was the bet?"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <TurnstileField turnstile={turnstile} />

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
