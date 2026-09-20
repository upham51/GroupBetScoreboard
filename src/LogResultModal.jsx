import { useEffect, useRef, useState } from 'react'
import { IconClose, IconTick } from './icons.jsx'

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

export default function LogResultModal({ roster, onClose, onLogged }) {
  const [winners, setWinners] = useState([])
  const [losers, setLosers] = useState([])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const toggle = (setter) => (id) =>
    setter((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))

  const ready = winners.length > 0 && losers.length > 0

  async function submit(event) {
    event.preventDefault()
    if (!ready || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onLogged({ winners, losers, note })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
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

        <div className="modal-foot">
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={submitting}>
            Close
          </button>
          <button type="submit" className="btn" disabled={!ready || submitting}>
            {submitting ? 'Logging the result' : 'Log the result'}
          </button>
        </div>
      </form>
    </div>
  )
}
