import { useEffect, useState } from 'react'
import { IconClock, IconPlus, IconTick } from './icons.jsx'

// The two ways to put something on the board, behind one button.
//
// They used to sit open at the bottom of every board, which cost two rows of
// the thing you came to read. Collapsed they are a single circle; open, they
// rise out of it and the circle turns into the close. Nothing else moves.
export default function ActionStack({ onLog, onBet }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  const pick = (action) => () => {
    setOpen(false)
    action()
  }

  return (
    <>
      {/* Dims rather than blocks: the board underneath is what you came back
          to read, and a tap anywhere on it closes the stack. */}
      {open ? (
        <button
          type="button"
          className="fab-scrim"
          aria-label="Close without adding anything"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="fab-stack fixed-to-canvas">
        {open ? (
          <div className="fab-actions">
            <button
              type="button"
              className="fab-action"
              style={{ animationDelay: '0.05s' }}
              onClick={pick(onBet)}
            >
              <span className="fab-action-mark" aria-hidden="true">
                <IconClock />
              </span>
              Open a bet
            </button>
            <button type="button" className="fab-action" onClick={pick(onLog)}>
              <span className="fab-action-mark" aria-hidden="true">
                <IconTick />
              </span>
              Log a result
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={`fab-main${open ? ' fab-main-open' : ''}`}
          aria-expanded={open}
          aria-label={open ? 'Close without adding anything' : 'Add to the board'}
          onClick={() => setOpen((v) => !v)}
        >
          {/* The ring says the button is waiting for something, which on this
              board is always true: somebody has a result they have not logged.
              Once the stack is open it has been answered. */}
          {open ? null : <span className="fab-ring" aria-hidden="true" />}
          <IconPlus className="fab-cross" width="22" height="22" />
        </button>
      </div>
    </>
  )
}
