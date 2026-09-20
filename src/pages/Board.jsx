import { useEffect, useRef, useState } from 'react'
import Canvas from '../Canvas.jsx'
import Mascot from '../Mascot.jsx'
import Toast from '../Toast.jsx'
import Standings from '../Standings.jsx'
import LogResultModal from '../LogResultModal.jsx'
import NewBetModal from '../NewBetModal.jsx'
import SettleModal from '../SettleModal.jsx'
import ActiveBets from '../ActiveBets.jsx'
import ResultCard from '../ResultCard.jsx'
import History from '../History.jsx'
import Stats from '../Stats.jsx'
import ShareCard from '../ShareCard.jsx'
import { fetchBoard, logResult, createBet, settleBet, hideResult, hideMember } from '../api.js'
import { useBoard } from '../useBoard.js'
import { useToast } from '../useToast.js'
import { Link } from '../router.jsx'
import { IconChart, IconPlus, IconSpark, IconTrophy, IconUndo } from '../icons.jsx'

const TABS = [
  { key: 'board', label: 'Board', Icon: IconTrophy },
  { key: 'stats', label: 'Stats', Icon: IconChart },
  { key: 'history', label: 'History', Icon: IconUndo },
  { key: 'share', label: 'Share', Icon: IconSpark },
]

// What the header says above each tab. The board's own line comes from the
// summary the server already writes, so the sentence under the group name is
// the same one that goes out in the link preview.
function heroFor(tab, board, status) {
  if (status === 'loading') {
    return { eyebrow: 'Group scoreboard', title: 'Board', line: 'Reading the board.' }
  }
  if (status === 'error') {
    return { eyebrow: 'Group scoreboard', title: 'Board', line: 'This one would not load.' }
  }
  if (status === 'missing') {
    return { eyebrow: 'Group scoreboard', title: 'Board', line: 'There is no board at this link.' }
  }
  if (tab === 'stats') {
    return {
      eyebrow: 'Receipts',
      title: 'The numbers',
      line: 'Nobody gets to round their record up in here.',
    }
  }
  if (tab === 'history') {
    return {
      eyebrow: 'Nothing is deleted',
      title: 'History',
      line: 'Every removal is logged, with a way back.',
    }
  }
  if (tab === 'share') {
    return {
      eyebrow: 'Distribution',
      title: 'Share card',
      line: 'Paste the link and the board shows up with it.',
    }
  }
  const names = board.roster.length
  return {
    eyebrow: `Group scoreboard · ${names} ${names === 1 ? 'name' : 'names'}`,
    title: board.group.name,
    line: `${board.summary.headline} ${board.summary.detail}`,
  }
}

// The face follows the board's mood, which is a second signal for something the
// line beside it already says in words: a cold run and no hot one is the only
// state that turns it down.
function moodOf(board) {
  if (!board) return 'good'
  const sides = Object.values(board.streaks || {}).map((s) => s.side)
  return sides.includes('lose') && !sides.includes('win') ? 'glum' : 'good'
}

function LoadingBoard() {
  return (
    <div className="panel" aria-busy="true">
      <div className="panel-rule" />
      {[62, 44, 54, 38].map((width, i) => (
        <div className="skeleton-row" key={i}>
          <span className="skeleton-bar" style={{ width: `${width}%` }} />
        </div>
      ))}
    </div>
  )
}

function ShareLink({ slug, onCopied, className = 'btn-secondary' }) {
  const [state, setState] = useState('idle')
  const timer = useRef(null)
  const url = `${window.location.origin}/g/${encodeURIComponent(slug)}`

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      onCopied?.()
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setState('idle'), 2600)
    } catch {
      setState('failed')
    }
  }

  // A browser that refuses the clipboard is not an error to apologise for; the
  // link is right there to be copied by hand.
  if (state === 'failed') {
    return (
      <span className="share-fallback">
        This browser would not let the page copy for you. The link is <a href={url}>{url}</a>
      </span>
    )
  }

  return (
    <button type="button" className={`btn ${className}`} onClick={copy}>
      {state === 'copied' ? 'Link copied' : 'Copy the link'}
    </button>
  )
}

export default function Board({ slug }) {
  const { status, board, message, reload, apply, leaderChange } = useBoard(slug)
  const [tab, setTab] = useState('board')
  const [modal, setModal] = useState(null)
  const [settling, setSettling] = useState(null)
  const [showPast, setShowPast] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const { message: toast, flash } = useToast()

  // Saves happen, then the board it produced is fetched but held back until the
  // sheet closes, so the reorder plays in view rather than behind the dim.
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
    setTab('board')
    if (next) apply(next)
    else reload()
    flash('Board updated. Somebody is going to be upset.')
  }

  // Removals are immediate and reversible, so they do not get a confirm step;
  // the History tab is the way back, and the toast says so.
  async function remove(kind, item, label) {
    setBusyId(item.id)
    setActionError(null)
    try {
      if (kind === 'member') await hideMember(slug, item.id)
      else await hideResult(slug, item.id)
      await reload()
      flash(`${label} is off the board. It is in History.`)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const ready = status === 'ok'
  const hero = heroFor(tab, ready ? board : null, status)
  const canLog = ready && board.roster.length >= 2

  return (
    <Canvas>
      <header className="hero">
        <span className="hero-mesh" aria-hidden="true" />
        <span className="grain grain-over" aria-hidden="true" />
        <div className="hero-top">
          <div style={{ minWidth: 0 }}>
            <span className="hero-eyebrow">{hero.eyebrow}</span>
            <h1 className="hero-title">{hero.title}</h1>
          </div>
          <Mascot mood={moodOf(ready ? board : null)} />
        </div>
        <p className="hero-line">{hero.line}</p>
      </header>

      <div className="sheet">
        <div className="sheet-grip" aria-hidden="true" />

        {status === 'loading' ? (
          <div className="tab-pane">
            <LoadingBoard />
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="tab-pane">
            <div className="state state-error" role="alert">
              <span className="state-title">The board could not be read.</span>
              <p className="state-body">{message} Nothing was changed, and no result was lost.</p>
              <p className="state-body">
                <button type="button" className="linkish" onClick={reload}>
                  Try again
                </button>
              </p>
            </div>
          </div>
        ) : null}

        {status === 'missing' ? (
          <div className="tab-pane">
            <div className="state">
              <span className="state-title">No board with that link.</span>
              <p className="state-body">
                Check the link you were sent, or <Link to="/new">start a board of your own</Link>.
              </p>
            </div>
          </div>
        ) : null}

        {ready && tab === 'board' ? (
          <div className="tab-pane tab-pane-flush">
            {actionError ? (
              <p className="form-error" style={{ margin: '0 20px 14px' }} role="alert">
                {actionError}
              </p>
            ) : null}

            <ActiveBets
              bets={board.activeBets}
              busyId={busyId}
              onSettle={(bet) => setSettling(bet)}
              onRemove={(bet) => remove('bet', bet, bet.note || 'That bet')}
            />

            <div className="panel-inset">
              <Standings
                slug={slug}
                standings={board.standings}
                roster={board.roster}
                streaks={board.streaks}
                leaderMemberId={board.leaderMemberId}
                latestResult={board.latestResult}
                rivalry={board.rivalry}
                /* Before the first result everybody is tied, so a column of 1s
                   would read as a bug rather than as a standing. */
                ranked={board.resultCount > 0}
                leaderChange={leaderChange}
                onRemoveMember={(member) =>
                  remove('member', { id: member.member_id }, member.name)
                }
              />
            </div>

            {board.resultCount === 0 ? (
              /* An empty board is the roster, not a placeholder. The only thing
                 missing is the first result, so say exactly that. */
              <p className="board-summary">
                No results yet.{' '}
                {canLog ? (
                  <button type="button" className="linkish" onClick={() => setModal('log')}>
                    Log the first one
                  </button>
                ) : (
                  'A board needs two names before anything can be logged.'
                )}
              </p>
            ) : (
              <p className="board-summary">
                <strong>{board.summary.headline}</strong> {board.summary.detail}
              </p>
            )}

            <div className="board-actions">
              <ShareLink slug={slug} onCopied={() => flash('Link copied. Go ruin an afternoon.')} />
              <button type="button" className="btn btn-secondary" onClick={() => setTab('share')}>
                Share card
              </button>
            </div>

            {board.resultCount > 0 ? (
              <div style={{ padding: '10px 20px 0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  aria-expanded={showPast}
                  onClick={() => setShowPast((v) => !v)}
                >
                  {showPast ? 'Hide settled bets' : `Settled bets (${board.resultCount})`}
                </button>
              </div>
            ) : null}

            {showPast ? (
              <section style={{ padding: '12px 20px 0' }}>
                <ul className="past-list">
                  {board.pastResults.map((result) => (
                    <ResultCard
                      key={result.id}
                      result={result}
                      busy={busyId === result.id}
                      onRemove={(item) => remove('result', item, 'That result')}
                    />
                  ))}
                </ul>
                {board.resultCount > board.pastResults.length ? (
                  <p className="hint" style={{ marginTop: 10 }}>
                    Showing the most recent {board.pastResults.length} of {board.resultCount}.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {ready && tab === 'stats' ? (
          <div className="tab-pane">
            <Stats slug={slug} board={board} />
          </div>
        ) : null}

        {ready && tab === 'history' ? (
          <div className="tab-pane">
            <p className="pane-lead">
              Nothing is ever deleted. Anybody can take something off the board, and anybody can put
              it back.
            </p>
            <History slug={slug} onRestored={reload} onFlash={flash} />
          </div>
        ) : null}

        {ready && tab === 'share' ? (
          <div className="tab-pane">
            <p className="pane-lead">This is what lands in the group chat when you paste the link.</p>
            <ShareCard board={board} />
            <ShareLink
              slug={slug}
              className="btn-ink btn-block"
              onCopied={() => flash('Link copied. Go ruin an afternoon.')}
            />
            <p className="hint">
              <Link to={`/g/${encodeURIComponent(slug)}/board`}>Open it on its own page</Link> if you
              would rather screenshot it without the tabs.
            </p>
          </div>
        ) : null}
      </div>

      {canLog && tab === 'board' && !modal && !settling ? (
        <div className="fab-stack fixed-to-canvas" style={{ alignItems: 'flex-end' }}>
          <button type="button" className="fab-quiet" onClick={() => setModal('bet')}>
            Open a bet
          </button>
          <button type="button" className="fab-main" onClick={() => setModal('log')}>
            <span className="fab-ring" aria-hidden="true" />
            <span className="fab-plus" aria-hidden="true">
              <IconPlus width="18" height="18" />
            </span>
            <span className="fab-label">Log a result</span>
          </button>
        </div>
      ) : null}

      {/* A board that could not be read has nothing to switch between, so the
          tabs stay away until there is something behind them. */}
      {ready ? (
        <nav className="nav fixed-to-canvas" aria-label="Board views">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`nav-item${tab === key ? ' nav-item-on' : ''}`}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => setTab(key)}
            >
              <Icon className="nav-icon" width="18" height="18" />
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      <Toast message={toast} />

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
    </Canvas>
  )
}
