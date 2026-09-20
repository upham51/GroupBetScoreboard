import { useEffect, useRef, useState } from 'react'
import Standings from '../Standings.jsx'
import LogResultModal from '../LogResultModal.jsx'
import SeasonBar from '../SeasonBar.jsx'
import PastSeasons from '../PastSeasons.jsx'
import { fetchBoard, logResult } from '../api.js'
import { useBoard } from '../useBoard.js'
import { Link } from '../router.jsx'
import { IconFrame, IconLink, IconPlus, IconTick } from '../icons.jsx'

function ShareLink({ slug }) {
  const [state, setState] = useState('idle')
  const timer = useRef(null)
  const url = `${window.location.origin}/g/${encodeURIComponent(slug)}`

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setState('idle'), 2600)
    } catch {
      setState('failed')
    }
  }

  if (state === 'failed') {
    return (
      <span className="board-share-fallback">
        This browser would not let the page copy for you. The link is <a href={url}>{url}</a>
      </span>
    )
  }

  return (
    <button type="button" className="linkish" onClick={copy}>
      {state === 'copied' ? <IconTick /> : <IconLink />}
      {state === 'copied' ? 'Link copied' : 'Copy the board’s link'}
    </button>
  )
}

function LoadingBoard() {
  return (
    <div className="panel" aria-busy="true">
      <div className="row row-head">
        <span className="eyebrow">Loading the board</span>
      </div>
      {[62, 44, 54, 38].map((width, i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton-bar" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

export default function Board({ slug }) {
  const [scope, setScope] = useState(null)
  const { status, board, message, reload, apply, leaderChange } = useBoard(slug, scope)
  const [modalOpen, setModalOpen] = useState(false)
  const [showPast, setShowPast] = useState(false)

  // Save the result, then fetch the board it produced without applying it yet.
  // The modal holds its confirmation, and the new standings land as it closes
  // so the reorder happens in view.
  async function submitResult(payload, turnstileToken) {
    await logResult(slug, payload, turnstileToken)
    try {
      return await fetchBoard(slug, scope)
    } catch {
      return null
    }
  }

  function finishLogging(next) {
    setModalOpen(false)
    if (next) apply(next)
    else reload()
  }

  return (
    <>
      <header className="page board-head">
        <span className="eyebrow">Group scoreboard</span>
        <h1 className="board-name">{status === 'ok' ? board.group.name : 'Board'}</h1>
        {status === 'ok' ? (
          <SeasonBar
            slug={slug}
            board={board}
            scope={scope}
            onScope={setScope}
            onChanged={reload}
          />
        ) : null}
      </header>

      <main className="page">
        {status === 'loading' ? <LoadingBoard /> : null}

        {status === 'error' ? (
          <div className="state state-error" role="alert">
            <span className="state-title">The board could not be read.</span>
            <p className="state-body">{message} Nothing was changed, and no result was lost.</p>
            <p className="state-body">
              <button type="button" className="linkish" onClick={reload}>
                Try again
              </button>
            </p>
          </div>
        ) : null}

        {status === 'missing' ? (
          <div className="state">
            <span className="state-title">No board with that link.</span>
            <p className="state-body">
              Check the link you were sent, or <Link to="/new">start a board of your own</Link>.
            </p>
          </div>
        ) : null}

        {status === 'ok' ? (
          <>
            <Standings
              slug={slug}
              standings={board.standings}
              roster={board.roster}
              leaderMemberId={board.leaderMemberId}
              latestResult={board.latestResult}
              /* Before the first result everybody is tied, so a column of 1s
                 would read as a bug rather than as a standing. */
              ranked={board.resultCount > 0}
              leaderChange={leaderChange}
            />

            {board.resultCount === 0 ? (
              /* An empty board is the roster, not a placeholder. The only thing
                 missing is the first result, so say exactly that. */
              <p className="board-summary">
                No results yet.{' '}
                <button type="button" className="linkish" onClick={() => setModalOpen(true)}>
                  Log the first one
                </button>
                .
              </p>
            ) : (
              <p className="board-summary">
                <strong>{board.summary.headline}</strong> {board.summary.detail}
              </p>
            )}

            <div className="board-actions">
              <ShareLink slug={slug} />
              <Link className="linkish" to={`/g/${encodeURIComponent(slug)}/board`}>
                <IconFrame />
                Open the screenshot view
              </Link>
              {board.pastSeasons.length > 0 ? (
                <button type="button" className="linkish" onClick={() => setShowPast((v) => !v)}>
                  {showPast ? 'Hide past seasons' : `Past seasons (${board.pastSeasons.length})`}
                </button>
              ) : null}
            </div>

            {showPast ? (
              <PastSeasons seasons={board.pastSeasons} scope={scope} onScope={setScope} />
            ) : null}

            {/* How one group's board turns into somebody else's. */}
            <p className="board-footer">
              <Link to="/new">Start your own board</Link>
            </p>
          </>
        ) : null}
      </main>

      {status === 'ok' && board.roster.length >= 2 && !modalOpen ? (
        <button type="button" className="btn fab" onClick={() => setModalOpen(true)}>
          <IconPlus />
          Log a result
        </button>
      ) : null}

      {modalOpen ? (
        <LogResultModal
          roster={board.roster}
          onClose={() => setModalOpen(false)}
          onLogged={submitResult}
          onDone={finishLogging}
        />
      ) : null}
    </>
  )
}
