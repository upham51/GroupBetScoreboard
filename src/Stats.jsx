import { useCallback, useEffect, useState } from 'react'
import { fetchStats } from './api.js'
import { timeAgo } from './format.js'
import { IconFlame, IconFrost } from './icons.jsx'

// The receipts view.
//
// Win rate, the settled count and the two runs come out of the board payload
// that is already in hand. The blowout, the stakes count and the grudge tally
// need the results themselves, so those come from /stats and get their own
// loading, failed and empty states rather than blanks in the middle of the page.

function rateOf(row) {
  const played = row.wins + row.losses
  return played === 0 ? 0 : Math.round((row.wins / played) * 100)
}

function longest(streaks, side) {
  let best = null
  for (const [memberId, streak] of Object.entries(streaks || {})) {
    if (streak?.side !== side) continue
    if (!best || streak.length > best.length) best = { memberId, length: streak.length }
  }
  return best
}

export default function Stats({ slug, board }) {
  const [state, setState] = useState({ status: 'loading' })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const data = await fetchStats(slug)
      // Shaped on arrival so a payload that is missing a field renders as an
      // empty section rather than taking the page down.
      setState({
        status: 'ok',
        data: {
          owed: Number.isFinite(data?.owed) ? data.owed : null,
          grudges: Array.isArray(data?.grudges) ? data.grudges : [],
          blowout: data?.blowout ?? null,
          window: data?.window ?? null,
          truncated: Boolean(data?.truncated),
        },
      })
    } catch (err) {
      setState({ status: 'error', message: err.message })
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const nameOf = new Map(board.standings.map((r) => [r.member_id, r.name]))
  const hottest = longest(board.streaks, 'win')
  const coldest = longest(board.streaks, 'lose')
  const played = board.standings.filter((r) => r.wins + r.losses > 0)
  const best = played.length ? Math.max(...played.map(rateOf)) : 0

  if (board.resultCount === 0) {
    return (
      <div className="state">
        <span className="state-title">Nothing to count yet.</span>
        <p className="state-body">
          Win rates, runs and grudges all come from settled results. Log one and this page fills
          itself in.
        </p>
      </div>
    )
  }

  const stats = state.status === 'ok' ? state.data : null

  return (
    <>
      <div className="stat-pair">
        <div className="stat-tile stat-tile-orange">
          <span className="stat-orb" aria-hidden="true" />
          <div className="stat-label">Settled</div>
          <div className="stat-value">{board.resultCount}</div>
          <div className="stat-sub">
            {board.activeBets.length > 0
              ? `${board.activeBets.length} still open`
              : 'nothing left open'}
          </div>
        </div>
        <div className="stat-tile stat-tile-violet">
          <span className="stat-orb" aria-hidden="true" />
          <div className="stat-label">Owed</div>
          <div className="stat-value">{stats?.owed ?? '–'}</div>
          <div className="stat-sub">
            {/* The app never sees whether a round actually got bought, so it
                says what it does know: how many results named stakes. */}
            bets that named stakes
          </div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card-head">
          <span className="stat-card-title">Win rate</span>
          <span className="stat-card-note">settled only</span>
        </div>
        <div className="rate-list">
          {board.standings.map((row) => {
            const pct = rateOf(row)
            const untested = row.wins + row.losses === 0
            return (
              <div className="rate" key={row.member_id}>
                <span className="rate-name" title={row.name}>
                  {row.name}
                </span>
                <span className="rate-track">
                  <span
                    className={`rate-fill${pct === best && !untested ? ' rate-fill-top' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="rate-pct">{untested ? '–' : `${pct}%`}</span>
              </div>
            )
          })}
        </div>
      </div>

      {state.status === 'loading' ? (
        <div className="state" aria-busy="true">
          <span className="state-title">Counting up the rest.</span>
          <span className="skeleton-bar" style={{ display: 'block', width: '70%', marginTop: 6 }} />
          <span className="skeleton-bar" style={{ display: 'block', width: '48%' }} />
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="state state-error" role="alert">
          <span className="state-title">The rest of the numbers could not be read.</span>
          <p className="state-body">
            {state.message} The win rates above come from the board and are unaffected.
          </p>
          <p className="state-body">
            <button type="button" className="linkish" onClick={load}>
              Try again
            </button>
          </p>
        </div>
      ) : null}

      {stats?.blowout ? (
        <section className="blowout">
          <img
            className="blowout-photo"
            src="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=70"
            alt=""
            loading="lazy"
            aria-hidden="true"
          />
          <span className="blowout-veil" aria-hidden="true" />
          <div className="blowout-body">
            <span className="blowout-label">Biggest blowout</span>
            <h3 className="blowout-head">{stats.blowout.headline}</h3>
            <p className="blowout-sub">
              {[
                stats.blowout.note,
                `${stats.blowout.losers} on the losing end`,
                timeAgo(stats.blowout.settled_at),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </section>
      ) : null}

      <div className="stat-pair">
        <div className="temp-tile temp-hot">
          <div className="temp-label">Hottest</div>
          <div className="temp-body">
            <IconFlame className="temp-icon" width="26" height="26" />
            <span className="temp-name">{hottest ? nameOf.get(hottest.memberId) : 'Nobody'}</span>
          </div>
          <div className="temp-sub">
            {hottest ? `${hottest.length} wins in a row` : 'no run of three yet'}
          </div>
        </div>
        <div className="temp-tile temp-cold">
          <div className="temp-label">Coldest</div>
          <div className="temp-body">
            <IconFrost className="temp-icon" width="26" height="26" />
            <span className="temp-name">{coldest ? nameOf.get(coldest.memberId) : 'Nobody'}</span>
          </div>
          <div className="temp-sub">
            {coldest ? `${coldest.length} losses in a row` : 'no run of three yet'}
          </div>
        </div>
      </div>

      {stats ? (
        <div className="stat-card">
          <div className="stat-card-head">
            <span className="stat-card-title">Grudge index</span>
            <span className="stat-card-note">
              {stats.truncated && stats.window ? `last ${stats.window}` : 'all time'}
            </span>
          </div>
          {stats.grudges.length === 0 ? (
            <p className="hint">
              No pair has met twice yet. A grudge takes a rematch.
            </p>
          ) : (
            <div className="grudge-list">
              {stats.grudges.map((g) => (
                <div className="grudge" key={g.pair}>
                  <span className="grudge-pair">{g.pair}</span>
                  <span className="grudge-score">
                    <span className="grudge-a">{g.a}</span>
                    <span className="grudge-b">{g.b}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
