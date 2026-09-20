import { IconTick } from './icons.jsx'
import { avatarFor } from './avatars.js'

// The chip multi-select used by every form that names people.
//
// Picked is never carried by the fill alone: the chip also grows a tick, and
// aria-pressed says it out loud. tone only decides which half of the palette
// the fill comes from, warm for the winning side and violet for the losing one.
export default function PeoplePicker({
  label,
  hint,
  people,
  picked,
  blocked = [],
  tone = 'win',
  onToggle,
}) {
  return (
    <div className="modal-block">
      <span className="field-label" style={{ display: 'block', marginBottom: 9 }}>
        {label} {hint ? <span className="field-label-note">{hint}</span> : null}
      </span>
      <div className="chips">
        {people.map((person) => {
          const isPicked = picked.includes(person.id)
          const isBlocked = !isPicked && blocked.includes(person.id)
          return (
            <button
              key={person.id}
              type="button"
              className={`chip chip-${tone}`}
              aria-pressed={isPicked}
              disabled={isBlocked}
              title={isBlocked ? `${person.name} is already on the other side.` : undefined}
              onClick={() => onToggle(person.id)}
            >
              <span
                className="avatar avatar-xs"
                style={{ background: avatarFor(person.id), opacity: isBlocked ? 0.4 : 1 }}
                aria-hidden="true"
              />
              {person.name}
              {isPicked ? <IconTick aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
