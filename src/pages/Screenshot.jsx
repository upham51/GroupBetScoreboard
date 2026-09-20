import Standings from '../Standings.jsx'
import { useBoard } from '../useBoard.js'

// The fallback share surface: just the standings, no buttons, sized so a manual
// screenshot comes out clean.
export default function Screenshot({ slug }) {
  const { status, board, message } = useBoard(slug)

  return (
    <div className="shot">
      <div className="shot-inner">
        {status === 'ok' ? (
          <>
            <span className="eyebrow">Group scoreboard</span>
            <h1 className="shot-name">{board.group.name}</h1>
            <Standings
              standings={board.standings}
              leaderMemberId={board.leaderMemberId}
              ranked={board.resultCount > 0}
              showLatest={false}
            />
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
