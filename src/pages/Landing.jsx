import { useState } from 'react'
import Canvas from '../Canvas.jsx'
import { Link } from '../router.jsx'
import { IconArrowRight } from '../icons.jsx'

export default function Landing() {
  // There is no directory and no login, so "I was sent a link" cannot go
  // anywhere: a board only opens from its own address. Saying that plainly
  // beats a button that leads nowhere.
  const [asking, setAsking] = useState(false)

  return (
    <Canvas>
      <main className="landing">
        <span className="landing-blob-a" aria-hidden="true" />
        <span className="landing-blob-b" aria-hidden="true" />
        <span className="grain grain-over" aria-hidden="true" />

        <div className="landing-body">
          <span className="landing-eyebrow">Group scoreboard</span>
          <h1 className="landing-headline">
            Talk is cheap.
            <br />
            The board isn&rsquo;t.
          </h1>
          <p className="landing-pitch">
            Your group already runs the bets. This one keeps the receipts, so nobody gets to rewrite
            history in the group chat.
          </p>

          <Link className="landing-cta" to="/new">
            Start your group&rsquo;s board
            <span className="landing-cta-mark" aria-hidden="true">
              <IconArrowRight />
            </span>
          </Link>

          <button
            type="button"
            className="landing-aside"
            aria-expanded={asking}
            onClick={() => setAsking((v) => !v)}
          >
            I was sent a link
          </button>

          {asking ? (
            <p className="landing-note">
              Open the link itself and the board is there. Every board lives at its own address and
              there is nothing to sign in to, which also means there is no way to look one up from
              here. If the link has gone missing, ask whoever sent it.
            </p>
          ) : null}
        </div>
      </main>
    </Canvas>
  )
}
