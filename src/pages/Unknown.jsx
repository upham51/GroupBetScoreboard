import Canvas from '../Canvas.jsx'
import { Link } from '../router.jsx'
import { IconArrowRight } from '../icons.jsx'

export default function Unknown() {
  return (
    <Canvas>
      <main className="landing">
        <span className="landing-blob-a" aria-hidden="true" />
        <span className="landing-blob-b" aria-hidden="true" />
        <span className="grain grain-over" aria-hidden="true" />

        <div className="landing-body">
          <span className="landing-eyebrow">Group scoreboard</span>
          <h1 className="landing-headline">Nothing lives at this address.</h1>
          <p className="landing-pitch">
            If somebody sent you a board link, check it for a missing character. The links skip the
            letters people misread, so an i or a zero in there is a sign something got retyped
            wrong.
          </p>
          <Link className="landing-cta" to="/new">
            Start a board instead
            <span className="landing-cta-mark" aria-hidden="true">
              <IconArrowRight />
            </span>
          </Link>
        </div>
      </main>
    </Canvas>
  )
}
