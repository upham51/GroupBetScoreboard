import { useMemo, useState } from 'react'
import { createGroup } from '../api.js'
import Canvas from '../Canvas.jsx'
import { Link } from '../router.jsx'
import { IconBack } from '../icons.jsx'
import TurnstileField from '../TurnstileField.jsx'
import { useTurnstile } from '../useTurnstile.js'
// The same parser the create-group function runs, so the count shown here is
// exactly what ends up on the board.
import { parseRoster, MAX_GROUP_NAME, MAX_ROSTER } from '../../functions/_lib/text.js'

export default function NewGroup() {
  const [name, setName] = useState('')
  const [roster, setRoster] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const turnstile = useTurnstile()
  const names = useMemo(() => parseRoster(roster), [roster])
  const ready = name.trim().length > 0 && names.length >= 2 && turnstile.ready

  async function submit(event) {
    event.preventDefault()
    if (!ready || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const created = await createGroup(name, roster, turnstile.token)
      // A full navigation so the board arrives with its own title and share
      // tags already in the page.
      window.location.assign(`/g/${encodeURIComponent(created.slug)}`)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
      // The token was spent on that attempt, so the next one needs a fresh one.
      turnstile.reset()
    }
  }

  return (
    <Canvas>
      <header className="hero hero-violet">
        <span className="hero-orb" aria-hidden="true" />
        <Link className="hero-back" to="/">
          <IconBack aria-hidden="true" />
          Back
        </Link>
        <h1 className="hero-title hero-title-lg">Start your group&rsquo;s board</h1>
        <p className="hero-line">
          Two names minimum. A result needs two sides, and somebody has to lose.
        </p>
      </header>

      <form className="form" onSubmit={submit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="field" style={{ animationDelay: '0.05s' }}>
          <label className="field-label" htmlFor="group-name">
            Group name
          </label>
          <input
            id="group-name"
            className="input"
            type="text"
            value={name}
            maxLength={MAX_GROUP_NAME}
            placeholder="Sunday league"
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field" style={{ animationDelay: '0.12s' }}>
          <label className="field-label" htmlFor="group-roster">
            Who is in <span className="field-label-note">one per line, or separated by commas</span>
          </label>
          <textarea
            id="group-roster"
            className="input"
            value={roster}
            rows={5}
            placeholder={'Dana\nSam\nAlex'}
            onChange={(event) => setRoster(event.target.value)}
          />
          <div className="counter">
            <span className="counter-chip">{names.length}</span>
            <span className="counter-text">{rosterHint(names)}</span>
          </div>
        </div>

        <div className="field" style={{ animationDelay: '0.18s' }}>
          <TurnstileField turnstile={turnstile} />
        </div>

        <button type="submit" className="btn btn-block" disabled={!ready || submitting}>
          {submitting ? 'Creating the board' : 'Create the board'}
        </button>
      </form>
    </Canvas>
  )
}

function rosterHint(names) {
  if (names.length === 0) return 'Nobody yet. Two is the minimum, because a result needs a loser.'
  if (names.length === 1) return 'One name. Somebody has to be wrong for this to work.'
  return `${names.length} names ready. Only these ${names.length} can be picked when a result gets logged, and blanks and repeats were dropped.${
    names.length >= MAX_ROSTER ? ` ${MAX_ROSTER} is the most one board holds.` : ''
  }`
}
