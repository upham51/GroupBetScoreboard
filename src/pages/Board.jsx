import { useEffect, useRef, useState } from 'react'
import Standings from '../Standings.jsx'
import LogResultModal from '../LogResultModal.jsx'
import { logResult } from '../api.js'
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
        This browser would not let the page copy for you. The link is{' '}
        <a href={url}>{url}</a>
      </span>
    )
  }

  return (
    <button type="button" className="linkish" onClick={copy}>
      {state === 'copied' ? <IconTick /> : <IconLink />}
      {state === 'copied' ? 'Link copied' : 'Copy the board\u2019s link'}
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
  const { status, board, message, reload } = useBoard(slug)
  const [modalOpen, setModalOpen] = useState(false)

  async function submitResult(payload) {
    await logResult(slug, payload)
    setModalOpen(false)
    await reload()
  }

  return (
    <>
      <header className="page board-head">
        <span className="eyebrow">Group scoreboard</span>
        <h1 className="board-name">{status === 'ok' ? board.group.name : 'Board'}</h1>
      </header>

      <main className="page">
        {status === 'loading' ? <LoadingBoard /> : null}

        {status === 'error' ? (
          <div className="state state-error" role="alert">
            <span className="state-title">The board could not be read.</span>
            <p className="state-body">
              {message} Nothing was changed, and no result was lost.
            </p>
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
              standings={board.standings}
              leaderMemberId={board.leaderMemberId}
              latestResult={board.latestResult}
              /* Before the first result everybody is tied, so a column of 1s
                 would read as a bug rather than as a standing. */
              ranked={board.resultCount > 0}
            />
            <p className="board-summary">
              <strong>{board.summary.headline}</strong> {board.summary.detail}
            </p>
            <div className="board-actions">
              <ShareLink slug={slug} />
              <Link className="linkish" to={`/g/${encodeURIComponent(slug)}/board`}>
                <IconFrame />
                Open the screenshot view
              </Link>
            </div>
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
        />
      ) : null}
    </>
  )
}
