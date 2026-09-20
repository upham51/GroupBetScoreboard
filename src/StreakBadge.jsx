import { IconFlame, IconFrost } from './icons.jsx'

// A streak of three or more, shown beside the name. The shape and the number
// carry it, not the colour: a flame for a run of wins, a frost mark for a run
// of losses, each with its count.
export default function StreakBadge({ streak }) {
  if (!streak || streak.length < 3) return null
  const winning = streak.side === 'win'
  return (
    <span
      className={`streak ${winning ? 'streak-win' : 'streak-lose'}`}
      title={`${streak.length} ${winning ? 'wins' : 'losses'} in a row`}
    >
      {winning ? <IconFlame className="streak-icon" /> : <IconFrost className="streak-icon" />}
      <span className="streak-count num">{streak.length}</span>
      <span className="visually-hidden">
        {' '}
        {streak.length} {winning ? 'wins' : 'losses'} in a row
      </span>
    </span>
  )
}
