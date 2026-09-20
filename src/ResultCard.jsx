import { joinNames, timeAgo } from './format.js'
import { IconTrash } from './icons.jsx'

// One settled result. The stakes get their own labelled line rather than being
// folded into the note, because the stakes are what make it a wager rather
// than a scored event.
export default function ResultCard({ result, onRemove, busy }) {
  const headline =
    result.winners.length && result.losers.length
      ? `${joinNames(result.winners.map((p) => p.name))} beat ${joinNames(
          result.losers.map((p) => p.name),
        )}`
      : 'A result'

  return (
    <li className="bet">
      <div className="bet-main">
        <span className="bet-head">{headline}</span>
        {result.note ? <span className="bet-note">{result.note}</span> : null}
        {result.stakes ? (
          <span className="bet-stakes">
            <span className="eyebrow">Stakes</span> {result.stakes}
          </span>
        ) : null}
        <span className="bet-when">{timeAgo(result.settled_at || result.created_at)}</span>
      </div>
      {onRemove ? (
        <button
          type="button"
          className="icon-btn bet-remove"
          onClick={() => onRemove(result)}
          disabled={busy}
          aria-label={`Remove: ${headline}`}
          title="Remove from the board"
        >
          <IconTrash />
        </button>
      ) : null}
    </li>
  )
}
