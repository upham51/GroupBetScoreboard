import { Link } from '../router.jsx'

export default function Landing() {
  return (
    <main className="page centered">
      <div>
        <span className="eyebrow">Group scoreboard</span>
        <h1 className="headline">
          Your group already runs the bets. This keeps the score.
        </h1>
      </div>
      <div>
        <Link className="btn" to="/new">
          Start your group&rsquo;s board
        </Link>
      </div>
    </main>
  )
}
