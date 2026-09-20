import { joinNames, timeAgo } from './format.js'
import { IconTrash } from './icons.jsx'

// Bets that have been made but not decided. They count toward nothing until
// somebody settles them.
export default function ActiveBets({ bets, onSettle, onRemove, busyId }) {
  if (!bets.length) return null
  return (
    <section className="open">
      <h2 className="section-head">
        <span className="eyebrow">Open bets</span>
      </h2>
      <ul className="bet-list">
        {bets.map((bet) => (
          <li key={bet.id} className="bet bet-open">
            <div className="bet-main">
              <span className="bet-head">{bet.note}</span>
              <span className="bet-note">{joinNames(bet.players.map((p) => p.name))}</span>
              {bet.stakes ? (
                <span className="bet-stakes">
                  <span className="eyebrow">Stakes</span> {bet.stakes}
                </span>
              ) : null}
              <span className="bet-when">Opened {timeAgo(bet.created_at)}</span>
            </div>
            <div className="bet-actions">
              <button
                type="button"
                className="btn btn-small"
                onClick={() => onSettle(bet)}
                disabled={busyId === bet.id}
              >
                Settle this
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => onRemove(bet)}
                disabled={busyId === bet.id}
                aria-label={`Remove the bet: ${bet.note}`}
                title="Remove from the board"
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
