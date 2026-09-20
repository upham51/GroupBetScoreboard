import { IconScales } from './icons.jsx'

// Only rendered when the database has one to give. A group where no pair has
// met twice has no closest rivalry, and saying nothing is the right answer
// rather than an empty box. It sits along the bottom edge of the standings,
// because it is a fact about the panel above it.
export default function Rivalry({ rivalry }) {
  if (!rivalry) return null
  const { a, b, a_wins, b_wins, total_meetings } = rivalry
  return (
    <p className="rivalry">
      <span className="rivalry-mark" aria-hidden="true">
        <IconScales />
      </span>
      <span className="rivalry-text">
        <strong>
          {a.name} and {b.name}, {a_wins} and {b_wins}
        </strong>{' '}
        over {total_meetings} meetings. Neither will let it go.
      </span>
    </p>
  )
}
