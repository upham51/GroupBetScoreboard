import { Link } from '../router.jsx'

export default function Unknown() {
  return (
    <main className="page centered">
      <div>
        <span className="eyebrow">Group scoreboard</span>
        <h1 className="headline">Nothing lives at this address.</h1>
      </div>
      <p className="pitch">
        If somebody sent you a board link, check it for a missing character. Otherwise you can{' '}
        <Link to="/new">start a board</Link>.
      </p>
    </main>
  )
}
