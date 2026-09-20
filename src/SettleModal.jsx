import { useEffect, useRef, useState } from 'react'
import PeoplePicker from './PeoplePicker.jsx'
import SideSummary from './SideSummary.jsx'
import TurnstileField from './TurnstileField.jsx'
import SuccessCheck from './SuccessCheck.jsx'
import { useTurnstile } from './useTurnstile.js'
import { joinNames } from './format.js'
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
  const sided = covered && winners.length > 0 && losers.length > 0
  const ready = sided && turnstile.ready
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
            label="Bet settled"
            sub="The standings are about to move. Watch the rows."
          />
        </div>
      ) : (
        <form
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settle-title"
          onSubmit={submit}
        >
          <div className="modal-grip" aria-hidden="true" />
          <div className="modal-head">
            <h2 className="modal-title" id="settle-title">
              Settle this bet
            </h2>
            <button
              ref={closeRef}
              type="button"
              className="icon-btn icon-btn-close"
              onClick={onClose}
              aria-label="Close without settling"
            >
              <IconClose />
            </button>
          </div>
          <p className="modal-sub">
            {bet.note}
            {bet.stakes ? ` · ${bet.stakes}` : ''}
          </p>
          {/* The thing people ask the first time a bet has more than two names
              on it: a side is not a place, it is what the board charges you. */}
          <p className="hint" style={{ marginBottom: 18 }}>
            Everybody named on this bet needs a side. Everyone you put on the
            winning side takes a win, everyone on the losing side takes a loss,
            however many that is.
          </p>

          {error ? (
            <p className="form-error" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </p>
          ) : null}

          <PeoplePicker
            label="Who won"
            hint="pick one or more"
            tone="win"
            people={people}
            picked={winners}
            blocked={losers}
            onToggle={toggle(setWinners, setLosers)}
          />
          <PeoplePicker
            label="Who lost"
            hint="pick one or more"
            tone="lose"
            people={people}
            picked={losers}
            blocked={winners}
            onToggle={toggle(setLosers, setWinners)}
          />

          <SideSummary people={people} winners={winners} losers={losers} />

          {/* Directly under the sides it is about, not stranded past the
              browser check. */}
          <p className="hint" style={{ marginBottom: 18 }}>
            {covered
              ? sided
                ? 'Everybody on this bet has a side. Send it.'
                : 'Both sides need somebody on them.'
              : `Still to place: ${joinNames(undecided.map((p) => p.name))}.`}
          </p>

          <div className="modal-block">
            <TurnstileField turnstile={turnstile} />
          </div>

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
