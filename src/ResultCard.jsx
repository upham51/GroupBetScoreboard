import { joinNames, timeAgo } from './format.js'
import { IconGlass, IconTrash } from './icons.jsx'

// One settled result: the same card as an open bet, calmed down. The stakes get
// their own line rather than being folded into the note, because the stakes are
// what make it a wager rather than a scored event.
export default function ResultCard({ result, onRemove, busy }) {
  const headline =
    result.winners.length && result.losers.length
      ? `${joinNames(result.winners.map((p) => p.name))} beat ${joinNames(
          result.losers.map((p) => p.name),
        )}`
      : 'A result'

  return (
    <li className="bet bet-past">
      <div className="bet-head">{headline}</div>
      {result.note ? <div className="bet-people">{result.note}</div> : null}
      {result.stakes ? (
        <div className="bet-stakes">
          <IconGlass aria-hidden="true" />
          {result.stakes}
        </div>
      ) : null}
      <span className="bet-when">{timeAgo(result.settled_at || result.created_at)}</span>

      {onRemove ? (
        <div className="bet-actions">
          <button
            type="button"
            className="bet-remove"
            onClick={() => onRemove(result)}
            disabled={busy}
            aria-label={`Take this off the board: ${headline}`}
            title="Take it off the board"
          >
            <IconTrash />
          </button>
        </div>
      ) : null}
    </li>
  )
}
