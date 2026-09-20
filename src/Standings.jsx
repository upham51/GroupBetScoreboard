import { formatNet, joinNames, timeAgo } from './format.js'

function LatestResult({ latest }) {
  if (!latest) return null
  const headline =
    latest.winners.length && latest.losers.length
      ? `${joinNames(latest.winners)} beat ${joinNames(latest.losers)}`
      : 'A result was logged'
  const body = [latest.note, timeAgo(latest.created_at)].filter(Boolean).join(' · ')
  return (
    <div className="panel-note">
      <span className="panel-note-head">{headline}</span>
      {body ? <span className="panel-note-body">{body}</span> : null}
    </div>
  )
}

export default function Standings({
  standings,
  leaderMemberId,
  latestResult,
  ranked = true,
  showLatest = true,
}) {
  if (!standings || standings.length === 0) {
    return (
      <div className="state">
        <span className="state-title">This board has no names on it.</span>
        <p className="state-body">
          A board needs a roster before anything can be logged. Start a new one and paste the names in.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="row row-head" aria-hidden="true">
        <span className="row-rank" />
        <span className="row-name" />
        <span className="eyebrow row-col row-record">W-L</span>
        <span className="eyebrow row-col row-net">Net</span>
      </div>

      {standings.map((row) => {
        const isLeader = row.member_id === leaderMemberId
        return (
          <div key={row.member_id} className={`row${isLeader ? ' row-leader' : ''}`}>
            <span className="row-rank num">{ranked ? row.rank : ''}</span>
            <span className="row-name">
              {row.name}
              {isLeader ? <span className="eyebrow row-flag">First</span> : null}
            </span>
            <span className="row-col row-record">
              {row.wins}-{row.losses}
            </span>
            <span className="row-col row-net">{formatNet(row.net)}</span>
          </div>
        )
      })}

      {showLatest ? <LatestResult latest={latestResult} /> : null}
    </div>
  )
}
