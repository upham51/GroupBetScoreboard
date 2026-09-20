import { useEffect, useState } from 'react'
import { fetchMember, fetchHeadToHead } from './api.js'
import { timeAgo } from './format.js'

function Highlight({ label, entry, verb, empty }) {
  return (
    <div className="detail-card">
      <span className="eyebrow">{label}</span>
      {/* Somebody with no wins has no best win. Saying so is not the same as an
          error and not the same as still loading, so it gets its own words. */}
      <div className="detail-line">
        {entry ? `${verb} ${entry.opponents} ${entry.opponents === 1 ? 'person' : 'people'}` : empty}
      </div>
      {entry ? (
        <div className="detail-sub">
          {[entry.note, timeAgo(entry.created_at)].filter(Boolean).join(' · ')}
        </div>
      ) : null}
    </div>
  )
}

// Head to head, one opponent at a time. Tapping a name fetches that pair's
// record and keeps it, so a few taps fill the row in. Asking for all of them up
// front would be a call per name on a roster that goes up to forty.
function HeadToHead({ slug, member, roster }) {
  const [scores, setScores] = useState({})
  const others = roster.filter((r) => r.id !== member.member_id)

  if (others.length === 0) return null

  async function open(opponent) {
    if (scores[opponent.id] && scores[opponent.id].status !== 'error') return
    setScores((current) => ({ ...current, [opponent.id]: { status: 'loading' } }))
    try {
      const data = await fetchHeadToHead(slug, member.member_id, opponent.id)
      setScores((current) => ({
        ...current,
        [opponent.id]: { status: 'ok', wins: data.wins, losses: data.losses },
      }))
    } catch (err) {
      setScores((current) => ({
        ...current,
        [opponent.id]: { status: 'error', message: err.message },
      }))
    }
  }

  const failed = others.find((o) => scores[o.id]?.status === 'error')

  return (
    <div className="detail-section">
      <span className="eyebrow">Head to head</span>
      <div className="h2h-chips">
        {others.map((other) => {
          const score = scores[other.id]
          const ahead = score?.status === 'ok' && score.wins > score.losses
          return (
            <button
              key={other.id}
              type="button"
              className="h2h-chip"
              aria-pressed={score?.status === 'ok'}
              onClick={() => open(other)}
            >
              {other.name}
              {score?.status === 'loading' ? <span className="detail-sub">counting</span> : null}
              {score?.status === 'ok' ? (
                <strong className={`h2h-score${ahead ? '' : ' h2h-score-behind'}`}>
                  {score.wins}&ndash;{score.losses}
                </strong>
              ) : null}
            </button>
          )
        })}
      </div>
      {failed ? (
        <p className="h2h-line detail-sub-error" role="alert">
          {scores[failed.id].message} Tap the name again to retry.
        </p>
      ) : null}
    </div>
  )
}

export default function MemberDetail({ slug, member, roster, onRemove }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    fetchMember(slug, member.member_id)
      .then((data) => live && setState({ status: 'ok', data }))
      .catch((err) => live && setState({ status: 'error', message: err.message }))
    return () => {
      live = false
    }
  }, [slug, member.member_id])

  return (
    <div className="detail">
      {state.status === 'loading' ? (
        <div className="detail-pair" aria-busy="true">
          <div className="detail-card">
            <span className="eyebrow">Best win</span>
            <span className="skeleton-bar" style={{ display: 'block', width: '70%', marginTop: 8 }} />
          </div>
          <div className="detail-card">
            <span className="eyebrow">Worst loss</span>
            <span className="skeleton-bar" style={{ display: 'block', width: '58%', marginTop: 8 }} />
          </div>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div className="detail-card" role="alert">
          <span className="eyebrow">Best win and worst loss</span>
          <div className="detail-line detail-sub-error">{state.message}</div>
          <div className="detail-sub">The standings above are unaffected.</div>
        </div>
      ) : null}

      {state.status === 'ok' ? (
        <div className="detail-pair">
          <Highlight
            label="Best win"
            entry={state.data.bestWin}
            verb="Beat"
            empty="No wins yet"
          />
          <Highlight
            label="Worst loss"
            entry={state.data.worstLoss}
            verb="Went down against"
            empty="No losses yet"
          />
        </div>
      ) : null}

      <HeadToHead slug={slug} member={member} roster={roster} />

      {/* Taking somebody off the board is soft: their row goes, their past
          results stay in the history, and anybody can put them back. */}
      {onRemove ? (
        <button type="button" className="linkish detail-remove" onClick={() => onRemove(member)}>
          Take {member.name} off the board
        </button>
      ) : null}
    </div>
  )
}
