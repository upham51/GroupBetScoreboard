import Standings from '../Standings.jsx'
import { useBoard } from '../useBoard.js'
import { Link } from '../router.jsx'

function onDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// A screenshot loses its context the second it is forwarded on, so the range
// the numbers cover is stated on the image itself.
function coverageLine(board) {
  const open = board.activeBets.length
  const pending = open > 0 ? ` \u00b7 ${open} still open` : ''
  if (board.resultCount === 0) return `No results yet${pending}`
  const from = onDate(board.coverage.first_result_at)
  const to = onDate(board.coverage.last_result_at)
  if (from && to) return (from === to ? from : `${from} to ${to}`) + pending
  return `All time${pending}`
}

// The fallback share surface: just the standings, sized so a manual screenshot
// comes out clean.
export default function Screenshot({ slug }) {
  const { status, board, message } = useBoard(slug)

  return (
    <div className="shot">
      <div className="shot-inner">
        {status === 'ok' ? (
          <>
            <span className="eyebrow">Group scoreboard</span>
            <h1 className="shot-name">{board.group.name}</h1>
            <p className="shot-range">{coverageLine(board)}</p>
            <Standings
              standings={board.standings}
              leaderMemberId={board.leaderMemberId}
              streaks={board.streaks}
              ranked={board.resultCount > 0}
              showLatest={false}
              interactive={false}
            />
            <p className="shot-footer">
              <Link to="/new">Start your own board</Link>
            </p>
          </>
        ) : null}

        {status === 'loading' ? (
          <div className="state" aria-busy="true">
            <span className="state-title">Loading the board.</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="state state-error" role="alert">
            <span className="state-title">The board could not be read.</span>
            <p className="state-body">{message}</p>
          </div>
        ) : null}

        {status === 'missing' ? (
          <div className="state">
            <span className="state-title">No board with that link.</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
