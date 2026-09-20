import { IconScales } from './icons.jsx'

// Only rendered when the database has one to give. A group where no pair has
// met twice has no closest rivalry, and saying nothing is the right answer
// rather than an empty box.
export default function Rivalry({ rivalry }) {
  if (!rivalry) return null
  const { a, b, a_wins, b_wins, total_meetings } = rivalry
  return (
    <p className="rivalry">
      <IconScales className="rivalry-icon" />
      <span>
        <span className="eyebrow">Closest rivalry</span>{' '}
        <strong>
          {a.name} and {b.name}, {a_wins} and {b_wins}
        </strong>{' '}
        over {total_meetings} meetings.
      </span>
    </p>
  )
}
