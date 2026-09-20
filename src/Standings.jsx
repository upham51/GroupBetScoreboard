import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import MemberDetail from './MemberDetail.jsx'
import { formatNet, joinNames, timeAgo } from './format.js'
import { IconChevron } from './icons.jsx'

// A position change is a different category of motion from hover and press
// feedback, so it does not use the 150ms interaction timing. Watching your own
// name move up the board is the point, and it wants some weight behind it.
const REORDER = { duration: 0.45, ease: [0.32, 0.72, 0, 1] }
const EXPAND = { duration: 0.24, ease: [0.2, 0.7, 0.4, 1] }

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

function Cells({ row, ranked, isLeader }) {
  return (
    <>
      <span className="row-rank num">{ranked ? row.rank : ''}</span>
      <span className="row-name">
        {row.name}
        {isLeader ? <span className="eyebrow row-flag">First</span> : null}
      </span>
      <span className="row-col row-record">
        {row.wins}-{row.losses}
      </span>
      <span className="row-col row-net">{formatNet(row.net)}</span>
    </>
  )
}

// How long the gold rule takes to draw itself when the lead changes hands.
// Rare, and marking a real event, so it gets its own timing.
const NEW_LEADER = { duration: 0.7, ease: [0.22, 1, 0.36, 1] }

export default function Standings({
  slug,
  standings,
  roster,
  leaderMemberId,
  latestResult,
  ranked = true,
  showLatest = true,
  interactive = true,
  leaderChange = 0,
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
          A board needs a roster before anything can be logged. Start a new one and paste the names in.
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
      <div className="row row-head" aria-hidden="true">
        <span className="row-rank" />
        <span className="row-name" />
        <span className="eyebrow row-col row-record">W-L</span>
        <span className="eyebrow row-col row-net">Net</span>
      </div>

      <ol className="rows">
        {standings.map((row) => {
          const isLeader = row.member_id === leaderMemberId
          const isOpen = openId === row.member_id

          if (!interactive) {
            return (
              <li key={row.member_id} className={`row${isLeader ? ' row-leader' : ''}`}>
                <Cells row={row} ranked={ranked} isLeader={isLeader} />
              </li>
            )
          }

          return (
            <motion.li
              key={row.member_id}
              layout="position"
              transition={reorder}
              className={`row-shell${isOpen ? ' row-shell-open' : ''}`}
            >
              <button
                type="button"
                className={`row row-button${isLeader ? ' row-leader' : ''}`}
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : row.member_id)}
              >
                <Cells row={row} ranked={ranked} isLeader={isLeader} />
                <IconChevron className={`row-chevron${isOpen ? ' row-chevron-open' : ''}`} />
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
                    <MemberDetail slug={slug} member={row} roster={roster} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.li>
          )
        })}
      </ol>

      {showLatest ? <LatestResult latest={latestResult} /> : null}
    </div>
  )
}
