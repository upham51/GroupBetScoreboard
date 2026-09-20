import Canvas from '../Canvas.jsx'
import ShareCard from '../ShareCard.jsx'
import { useBoard } from '../useBoard.js'
import { Link } from '../router.jsx'

// The chrome-free share surface, sized so a manual screenshot comes out clean.
// It is the same card as the Share tab inside the app, on its own page, because
// an unfurler and a screenshot should not show two different boards.
export default function Screenshot({ slug }) {
  const { status, board, message } = useBoard(slug)

  return (
    <Canvas>
      <div className="shot">
        <div className="shot-inner">
          {status === 'ok' ? (
            <>
              <ShareCard board={board} />
              <p className="shot-foot">
                <Link to="/new">Start your own board</Link>
              </p>
            </>
          ) : null}

          {status === 'loading' ? (
            <div className="state" aria-busy="true">
              <span className="state-title">Loading the board.</span>
              <span className="skeleton-bar" style={{ display: 'block', width: '62%', marginTop: 6 }} />
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="state state-error" role="alert">
              <span className="state-title">The board could not be read.</span>
              <p className="state-body">{message} Nothing was changed, and no result was lost.</p>
            </div>
          ) : null}

          {status === 'missing' ? (
            <div className="state">
              <span className="state-title">No board with that link.</span>
              <p className="state-body">
                Check the link for a missing character, or{' '}
                <Link to="/new">start a board of your own</Link>.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Canvas>
  )
}
