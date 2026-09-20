import { joinNames, timeAgo } from './format.js'
import { IconGlass, IconTrash } from './icons.jsx'

// Bets that have been made but not decided. They count toward nothing until
// somebody settles them, so they sit above the standings as their own rail
// rather than inside the panel: a queue of unfinished business you swipe
// through, not a row of the scoreboard.
export default function ActiveBets({ bets, onSettle, onRemove, busyId }) {
  if (!bets.length) return null
  return (
    <section className="open">
      <div className="open-head">
        <h2 className="eyebrow" style={{ margin: 0, whiteSpace: 'nowrap' }}>
          Open bets
        </h2>
        <span className="open-head-count">
          {bets.length} undecided
        </span>
      </div>

      <ul className="bet-rail">
        {bets.map((bet) => (
          <li key={bet.id} className="bet">
            <span className="bet-glow" aria-hidden="true" />
            <div className="bet-live">
              <span className="bet-dot" aria-hidden="true" />
              <span className="bet-live-label">Live</span>
            </div>
            <div className="bet-head">{bet.note}</div>
            <div className="bet-people">{joinNames(bet.players.map((p) => p.name))}</div>
            {bet.stakes ? (
              <div className="bet-stakes">
                <IconGlass aria-hidden="true" />
                {bet.stakes}
              </div>
            ) : null}
            <span className="bet-when">Opened {timeAgo(bet.created_at)}</span>

            <div className="bet-actions">
              <button
                type="button"
                className="bet-settle"
                onClick={() => onSettle(bet)}
                disabled={busyId === bet.id}
              >
                Settle this
              </button>
              <button
                type="button"
                className="bet-remove"
                onClick={() => onRemove(bet)}
                disabled={busyId === bet.id}
                aria-label={`Take the bet off the board: ${bet.note}`}
                title="Take it off the board"
              >
                <IconTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
