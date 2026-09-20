import { formatNet } from './format.js'

function onDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Closed seasons, with whoever took them. Worth being able to find again long
// after the fact, which is the whole point of ending one.
export default function PastSeasons({ seasons, scope, onScope }) {
  if (!seasons.length) return null
  return (
    <ul className="past-list">
      {seasons.map((season) => (
        <li key={season.id} className="past-item">
          <button
            type="button"
            className={`past-button${scope === season.id ? ' past-button-open' : ''}`}
            onClick={() => onScope(scope === season.id ? 'all' : season.id)}
          >
            <span className="past-name">{season.name}</span>
            <span className="past-champion">
              {season.champion
                ? `${season.champion.name} took it at ${formatNet(season.champion_net ?? 0)}`
                : 'Nobody played it'}
            </span>
            <span className="past-dates">
              {onDate(season.started_at)} to {onDate(season.ended_at)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
