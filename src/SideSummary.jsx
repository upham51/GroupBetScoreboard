import { joinNames } from './format.js'

// What each side currently holds, in words.
//
// With two people the chips are the whole story. With five, reading the fills
// off ten pills across two rows is not something anyone does, so the sides say
// themselves: who is winning this, who is losing it, and the sentence above
// says what that costs each of them.
export default function SideSummary({ people, winners, losers }) {
  const nameOf = new Map(people.map((p) => [p.id, p.name]))
  const named = (ids) => joinNames(ids.map((id) => nameOf.get(id)).filter(Boolean))

  return (
    <div className="sides">
      <div className="side">
        <span className="side-label side-label-win">Winning side</span>
        <span className={`side-names${winners.length ? '' : ' side-names-empty'}`}>
          {winners.length ? named(winners) : 'Nobody yet'}
        </span>
      </div>
      <div className="side">
        <span className="side-label side-label-lose">Losing side</span>
        <span className={`side-names${losers.length ? '' : ' side-names-empty'}`}>
          {losers.length ? named(losers) : 'Nobody yet'}
        </span>
      </div>
    </div>
  )
}
