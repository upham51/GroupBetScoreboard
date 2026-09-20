import { useEffect, useRef, useState } from 'react'
import PeoplePicker from './PeoplePicker.jsx'
import TurnstileField from './TurnstileField.jsx'
import SuccessCheck from './SuccessCheck.jsx'
import { useTurnstile } from './useTurnstile.js'
import { IconClose } from './icons.jsx'

// Deciding an open bet. Only the people already named on it can win or lose it,
// and all of them need a side: a settled bet with somebody left undecided would
// sit in the standings counting for nothing.
export default function SettleModal({ bet, onClose, onSettle, onDone }) {
  const [winners, setWinners] = useState([])
  const [losers, setLosers] = useState([])
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

  const people = bet.players
  const undecided = people.filter((p) => !winners.includes(p.id) && !losers.includes(p.id))
  const covered = undecided.length === 0
  const ready = covered && winners.length > 0 && losers.length > 0 && turnstile.ready
  const submitting = phase === 'sending'

  const toggle = (setter, other) => (id) => {
    setter((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
    other((current) => current.filter((x) => x !== id))
  }

  async function submit(event) {
    event.preventDefault()
    if (!ready || phase !== 'idle') return
    setPhase('sending')
    setError(null)
    let next
    try {
      next = await onSettle(bet, { winners, losers }, turnstile.token)
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
          <SuccessCheck label="Bet settled" />
        </div>
      ) : (
        <form className="modal" role="dialog" aria-modal="true" aria-labelledby="settle-title" onSubmit={submit}>
          <div className="modal-head">
            <h2 className="modal-title" id="settle-title">
              Settle this bet
            </h2>
            <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close without settling">
              <IconClose />
            </button>
          </div>
          <p className="modal-sub">{bet.note}</p>
          {bet.stakes ? (
            <p className="modal-sub">
              <span className="eyebrow">Stakes</span> {bet.stakes}
            </p>
          ) : null}

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <PeoplePicker
            label="Who won"
            hint="pick one or more"
            people={people}
            picked={winners}
            blocked={losers}
            onToggle={toggle(setWinners, setLosers)}
          />
          <PeoplePicker
            label="Who lost"
            hint="pick one or more"
            people={people}
            picked={losers}
            blocked={winners}
            onToggle={toggle(setLosers, setWinners)}
          />

          <p className="hint">
            {covered
              ? 'Everybody on this bet has a side.'
              : `Still to place: ${undecided.map((p) => p.name).join(', ')}.`}
          </p>

          <TurnstileField turnstile={turnstile} />

          <div className="modal-foot">
            <button type="button" className="btn btn-quiet" onClick={onClose} disabled={submitting}>
              Close
            </button>
            <button type="submit" className="btn" disabled={!ready || submitting}>
              {submitting ? 'Settling it' : 'Settle it'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
