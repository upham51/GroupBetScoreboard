import { useEffect, useRef, useState } from 'react'
import Standings from '../Standings.jsx'
import LogResultModal from '../LogResultModal.jsx'
import NewBetModal from '../NewBetModal.jsx'
import SettleModal from '../SettleModal.jsx'
import ActiveBets from '../ActiveBets.jsx'
import ResultCard from '../ResultCard.jsx'
import Rivalry from '../Rivalry.jsx'
import History from '../History.jsx'
import { fetchBoard, logResult, createBet, settleBet, hideResult, hideMember } from '../api.js'
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
  const { status, board, message, reload, apply, leaderChange } = useBoard(slug)
  const [modal, setModal] = useState(null)
  const [settling, setSettling] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  // Saves happen, then the board it produced is fetched but held back until the
  // modal closes, so the reorder plays in view rather than behind the dim.
  async function afterWrite() {
    try {
      return await fetchBoard(slug)
    } catch {
      return null
    }
  }

  const submitResult = async (payload, token) => {
    await logResult(slug, payload, token)
    return afterWrite()
  }
  const submitBet = async (payload, token) => {
    await createBet(slug, payload, token)
    return afterWrite()
  }
  const submitSettle = async (bet, payload, token) => {
    await settleBet(slug, bet.id, payload, token)
    return afterWrite()
  }

  function finish(next) {
    setModal(null)
    setSettling(null)
    if (next) apply(next)
    else reload()
  }

  // Removals are immediate and reversible, so they do not get a confirm step;
  // the History view is the way back.
  async function remove(kind, item) {
    setBusyId(item.id)
    setActionError(null)
    try {
      if (kind === 'member') await hideMember(slug, item.id)
      else await hideResult(slug, item.id)
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
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
            {actionError ? (
              <p className="form-error" role="alert">
                {actionError}
              </p>
            ) : null}

            <ActiveBets
              bets={board.activeBets}
              busyId={busyId}
              onSettle={(bet) => setSettling(bet)}
              onRemove={(bet) => remove('bet', bet)}
            />

            <Standings
              slug={slug}
              standings={board.standings}
              roster={board.roster}
              streaks={board.streaks}
              leaderMemberId={board.leaderMemberId}
              latestResult={board.latestResult}
              /* Before the first result everybody is tied, so a column of 1s
                 would read as a bug rather than as a standing. */
              ranked={board.resultCount > 0}
              leaderChange={leaderChange}
              onRemoveMember={(member) => remove('member', { id: member.member_id })}
            />

            <Rivalry rivalry={board.rivalry} />

            {board.resultCount === 0 ? (
              /* An empty board is the roster, not a placeholder. The only thing
                 missing is the first result, so say exactly that. */
              <p className="board-summary">
                No results yet.{' '}
                <button type="button" className="linkish" onClick={() => setModal('log')}>
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
              {board.resultCount > 0 ? (
                <button type="button" className="linkish" onClick={() => setShowPast((v) => !v)}>
                  {showPast ? 'Hide past bets' : `Past bets (${board.resultCount})`}
                </button>
              ) : null}
              <button type="button" className="linkish" onClick={() => setShowHistory((v) => !v)}>
                {showHistory ? 'Hide history' : 'History'}
              </button>
            </div>

            {showPast ? (
              <section className="past">
                <ul className="bet-list">
                  {board.pastResults.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      busy={busyId === result.id}
                      onRemove={(item) => remove('result', item)}
                    />
                  ))}
                </ul>
                {board.resultCount > board.pastResults.length ? (
                  <p className="hint">
                    Showing the most recent {board.pastResults.length} of {board.resultCount}.
                  </p>
                ) : null}
              </section>
            ) : null}

            {showHistory ? <History slug={slug} onRestored={reload} /> : null}

            {/* How one group's board turns into somebody else's. */}
            <p className="board-footer">
              <Link to="/new">Start your own board</Link>
            </p>
          </>
        ) : null}
      </main>

      {status === 'ok' && board.roster.length >= 2 && !modal && !settling ? (
        <div className="fab-stack">
          <button type="button" className="btn btn-secondary fab-item" onClick={() => setModal('bet')}>
            Open a bet
          </button>
          <button type="button" className="btn fab-item" onClick={() => setModal('log')}>
            <IconPlus />
            Log a result
          </button>
        </div>
      ) : null}

      {modal === 'log' ? (
        <LogResultModal
          roster={board.roster}
          onClose={() => setModal(null)}
          onLogged={submitResult}
          onDone={finish}
        />
      ) : null}

      {modal === 'bet' ? (
        <NewBetModal
          roster={board.roster}
          onClose={() => setModal(null)}
          onCreate={submitBet}
          onDone={finish}
        />
      ) : null}

      {settling ? (
        <SettleModal
          bet={settling}
          onClose={() => setSettling(null)}
          onSettle={submitSettle}
          onDone={finish}
        />
      ) : null}
    </>
  )
}
