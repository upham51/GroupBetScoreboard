import { useEffect, useRef, useState } from 'react'
import PeoplePicker from './PeoplePicker.jsx'
import TurnstileField from './TurnstileField.jsx'
import SuccessCheck from './SuccessCheck.jsx'
import { useTurnstile } from './useTurnstile.js'
import { IconClose } from './icons.jsx'
import { MAX_NOTE, MAX_STAKES } from '../functions/_lib/text.js'

// Opening a bet whose outcome nobody knows yet. No winner, no loser, nothing
// counted until somebody settles it.
export default function NewBetModal({ roster, onClose, onCreate, onDone }) {
  const [players, setPlayers] = useState([])
  const [note, setNote] = useState('')
  const [stakes, setStakes] = useState('')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const turnstile = useTurnstile()
  const closeRef = useRef(null)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (phase !== 'idle') return undefined
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, phase])

  const ready = players.length >= 2 && note.trim().length > 0 && turnstile.ready
  const submitting = phase === 'sending'

  async function submit(event) {
    event.preventDefault()
    if (!ready || phase !== 'idle') return
    setPhase('sending')
    setError(null)
    let next
    try {
      next = await onCreate({ players, note, stakes }, turnstile.token)
    } catch (err) {
      setError(err.message)
      setPhase('idle')
      turnstile.reset()
      return
    }
    setPhase('done')
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
          <SuccessCheck label="Bet opened" />
        </div>
      ) : (
        <form className="modal" role="dialog" aria-modal="true" aria-labelledby="new-bet-title" onSubmit={submit}>
          <div className="modal-head">
            <h2 className="modal-title" id="new-bet-title">
              Open a bet
            </h2>
            <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close without opening a bet">
              <IconClose />
            </button>
          </div>
          <p className="modal-sub">For something not decided yet. Settle it when you know.</p>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="field">
            <label className="eyebrow field-label" htmlFor="bet-note">
              What is the bet
            </label>
            <input
              id="bet-note"
              className="input"
              type="text"
              value={note}
              maxLength={MAX_NOTE}
              placeholder="Chiefs cover the spread"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <PeoplePicker
            label="Who is in"
            hint="two or more"
            people={roster}
            picked={players}
            onToggle={(id) =>
              setPlayers((current) =>
                current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
              )
            }
          />

          <div className="field">
            <label className="eyebrow field-label" htmlFor="bet-stakes">
              Stakes <span className="field-label-note">optional</span>
            </label>
            <input
              id="bet-stakes"
              className="input"
              type="text"
              value={stakes}
              maxLength={MAX_STAKES}
              placeholder="Loser buys drinks"
              onChange={(event) => setStakes(event.target.value)}
            />
          </div>

          <TurnstileField turnstile={turnstile} />

          <div className="modal-foot">
            <button type="button" className="btn btn-quiet" onClick={onClose} disabled={submitting}>
              Close
            </button>
            <button type="submit" className="btn" disabled={!ready || submitting}>
              {submitting ? 'Opening the bet' : 'Open the bet'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
