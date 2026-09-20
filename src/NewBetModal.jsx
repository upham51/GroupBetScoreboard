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

  const enough = players.length >= 2 && note.trim().length > 0
  const ready = enough && turnstile.ready
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
          <SuccessCheck label="Bet opened" sub="It counts for nothing until somebody settles it." />
        </div>
      ) : (
        <form
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-bet-title"
          onSubmit={submit}
        >
          <div className="modal-grip" aria-hidden="true" />
          <div className="modal-head">
            <h2 className="modal-title" id="new-bet-title">
              Open a bet
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="icon-btn icon-btn-close"
              onClick={onClose}
              aria-label="Close without opening a bet"
            >
              <IconClose />
            </button>
          </div>
          <p className="modal-sub">For something not decided yet. Settle it when you know.</p>

          {error ? (
            <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </p>
          ) : null}

          <div className="modal-block">
            <label className="field-label" htmlFor="bet-note" style={{ display: 'block', marginBottom: 8 }}>
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
            tone="win"
            people={roster}
            picked={players}
            onToggle={(id) =>
              setPlayers((current) =>
                current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
              )
            }
          />

          {/* Nobody is picking sides here, which is the part that reads as
              missing once there are more than two names in the bet. */}
          <p className="hint" style={{ marginTop: -6, marginBottom: 18 }}>
            Nobody has a side yet, and this counts for nothing until it does.
            Whoever settles it puts every name above on the winning or the
            losing side, and each of them takes a win or a loss from it. The
            stakes are between you: the board writes them down, it does not
            split them.
          </p>

          <div className="modal-block">
            <label className="field-label" htmlFor="bet-stakes" style={{ display: 'block', marginBottom: 8 }}>
              Stakes <span className="field-label-note">optional</span>
            </label>
            <input
              id="bet-stakes"
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

          <p className="hint" style={{ marginBottom: 14 }}>
            {enough
              ? 'Two or more are in and the bet has a name. Send it.'
              : 'A bet needs a name and at least two people in it.'}
          </p>

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
