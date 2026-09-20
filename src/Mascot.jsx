// The blob in the corner of the header.
//
// It has exactly one job beyond decoration: when the board's most recent news
// is somebody's losing run, the face turns down. That is a second signal for
// the thing the line beside it already says in words, never the only one.

export default function Mascot({ mood = 'good' }) {
  return (
    <div className={`mascot${mood === 'glum' ? ' mascot-glum' : ''}`} aria-hidden="true">
      <span className="mascot-body" />
      <span className="mascot-eye mascot-eye-l" />
      <span className="mascot-eye mascot-eye-r" />
      <span className="mascot-mouth" />
    </div>
  )
}
