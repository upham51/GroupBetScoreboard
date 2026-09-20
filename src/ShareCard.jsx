import { formatNet } from './format.js'
import { avatarFor } from './avatars.js'

function onDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// A screenshot loses its context the second it is forwarded on, so the range
// the numbers cover is stated on the card itself.
export function coverageLine(board) {
  const open = board.activeBets.length
  const pending = open > 0 ? ` · ${open} still open` : ''
  if (board.resultCount === 0) return `No results yet${pending}`
  const from = onDate(board.coverage.first_result_at)
  const to = onDate(board.coverage.last_result_at)
  if (from && to) return (from === to ? from : `${from} to ${to}`) + pending
  return `All time${pending}`
}

// What lands in the group chat when somebody pastes the link. The same card is
// used by the Share tab and by the standalone screenshot view, so the thing
// people photograph is the thing they were just looking at.
export default function ShareCard({ board }) {
  return (
    <div className="share-card">
      <span className="share-orb" aria-hidden="true" />
      <div className="share-eyebrow">Group scoreboard</div>
      <h2 className="share-name">{board.group.name}</h2>
      <p className="share-range">{coverageLine(board)}</p>

      <ol className="share-rows">
        {board.standings.map((row) => {
          const isLeader = row.member_id === board.leaderMemberId
          return (
            <li className="share-row" key={row.member_id}>
              <span className="share-rank">{board.resultCount > 0 ? row.rank : '–'}</span>
              <span
                className="avatar avatar-sm"
                style={{ background: avatarFor(row.member_id) }}
                aria-hidden="true"
              />
              <span className="share-who">{row.name}</span>
              <span className="share-record">
                {row.wins}-{row.losses}
              </span>
              <span
                className={`share-net${
                  isLeader ? ' share-net-leader' : row.net < 0 ? ' share-net-down' : ''
                }`}
              >
                {formatNet(row.net)}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="share-foot">Start your own board &rarr;</p>
    </div>
  )
}
