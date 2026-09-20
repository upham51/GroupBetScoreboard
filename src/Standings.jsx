import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import MemberDetail from './MemberDetail.jsx'
import Rivalry from './Rivalry.jsx'
import StreakBadge from './StreakBadge.jsx'
import { formatNet, joinNames, timeAgo } from './format.js'
import { avatarFor } from './avatars.js'
import { tagFor } from './tags.js'
import { IconTrophy } from './icons.jsx'

// A position change is a different category of motion from hover and press
// feedback, so it does not use the interaction timing. Watching your own name
// move up the board is the point, and it wants some weight behind it.
const REORDER = { duration: 0.45, ease: [0.32, 0.72, 0, 1] }
const EXPAND = { duration: 0.26, ease: [0.2, 0.7, 0.4, 1] }

// How long the gold rule takes to draw itself when the lead changes hands.
// Rare, and marking a real event, so it gets its own timing.
const NEW_LEADER = { duration: 0.7, ease: [0.22, 1, 0.36, 1] }

function LatestResult({ latest }) {
  if (!latest) return null
  // winners and losers are participant objects, not bare names.
  const headline =
    latest.winners.length && latest.losers.length
      ? `${joinNames(latest.winners.map((p) => p.name))} beat ${joinNames(
          latest.losers.map((p) => p.name),
        )}`
      : 'A result was logged'
  const body = [latest.note, timeAgo(latest.settled_at || latest.created_at)]
    .filter(Boolean)
    .join(' · ')
  return (
    <p className="rivalry">
      <span className="rivalry-mark" aria-hidden="true">
        <IconTrophy />
      </span>
      <span className="rivalry-text">
        <strong>{headline}</strong>
        {body ? ` ${body}.` : ''}
      </span>
    </p>
  )
}

function Cells({ row, ranked, isLeader, streak }) {
  const net = formatNet(row.net)
  return (
    <>
      <span className={`col-rank${isLeader ? ' col-rank-leader' : ''}`}>
        {ranked ? row.rank : '–'}
      </span>
      <span className="avatar" style={{ background: avatarFor(row.member_id) }} aria-hidden="true" />
      <span className="row-who">
        <span className="row-name">
          {row.name}
          {isLeader ? <span className="row-first">First</span> : null}
          <StreakBadge streak={streak} />
        </span>
        <span className="row-tag">{tagFor({ ...row, rank: ranked ? row.rank : 0 }, streak)}</span>
      </span>
      <span className="col-record">
        {row.wins}-{row.losses}
      </span>
      <span
        className={`col-net${isLeader ? ' col-net-leader' : row.net < 0 ? ' col-net-down' : ''}`}
      >
        {net}
      </span>
    </>
  )
}

export default function Standings({
  slug,
  standings,
  roster,
  leaderMemberId,
  latestResult,
  rivalry,
  streaks = {},
  ranked = true,
  showLatest = true,
  interactive = true,
  leaderChange = 0,
  onRemoveMember,
}) {
  const [openId, setOpenId] = useState(null)
  const reduceMotion = useReducedMotion()
  const reorder = reduceMotion ? { duration: 0 } : REORDER
  const expand = reduceMotion ? { duration: 0 } : EXPAND

  if (!standings || standings.length === 0) {
    return (
      <div className="state">
        <span className="state-title">This board has no names on it.</span>
        <p className="state-body">
          A board needs a roster before anything can be logged. Start a new one and paste the names
          in.
        </p>
      </div>
    )
  }

  return (
    <div className="panel">
      {/* The reserved gold rule. It sits still except when somebody new takes
          the top, when it redraws itself left to right. */}
      <motion.div
        key={leaderChange}
        className="panel-rule"
        initial={leaderChange > 0 && !reduceMotion ? { scaleX: 0 } : false}
        animate={{ scaleX: 1 }}
        transition={NEW_LEADER}
      />

      <div className="panel-head" aria-hidden="true">
        <span className="col-rank" style={{ background: 'none' }} />
        <span className="eyebrow" style={{ flex: '1 1 auto' }}>
          Standings
        </span>
        <span className="eyebrow" style={{ width: 52, textAlign: 'right' }}>
          W-L
        </span>
        <span className="eyebrow" style={{ width: 46, textAlign: 'right' }}>
          Net
        </span>
      </div>

      <ol className="rows">
        {standings.map((row) => {
          const isLeader = row.member_id === leaderMemberId
          const isOpen = openId === row.member_id

          if (!interactive) {
            return (
              <li key={row.member_id} className="row-shell">
                <div className={`row${isLeader ? ' row-leader' : ''}`}>
                  <Cells
                    row={row}
                    ranked={ranked}
                    isLeader={isLeader}
                    streak={streaks[row.member_id]}
                  />
                </div>
              </li>
            )
          }

          return (
            <motion.li
              key={row.member_id}
              layout="position"
              transition={reorder}
              className="row-shell"
            >
              <button
                type="button"
                className={`row${isLeader ? ' row-leader' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : row.member_id)}
              >
                <Cells
                  row={row}
                  ranked={ranked}
                  isLeader={isLeader}
                  streak={streaks[row.member_id]}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={expand}
                    className="detail-wrap"
                  >
                    <MemberDetail
                      slug={slug}
                      member={row}
                      roster={roster}
                      onRemove={onRemoveMember}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </ol>

      {showLatest ? <LatestResult latest={latestResult} /> : null}
      {showLatest ? <Rivalry rivalry={rivalry} /> : null}
    </div>
  )
}
