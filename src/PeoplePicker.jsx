import { IconTick } from './icons.jsx'

// The chip multi-select used by every form that names people.
export default function PeoplePicker({ label, hint, people, picked, blocked = [], onToggle }) {
  return (
    <div className="field">
      <span className="eyebrow field-label">
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
              className="chip"
              aria-pressed={isPicked}
              disabled={isBlocked}
              title={isBlocked ? `${person.name} is already on the other side.` : undefined}
              onClick={() => onToggle(person.id)}
            >
              {isPicked ? <IconTick className="chip-tick" /> : null}
              {person.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
