import { useMemo, useState } from 'react'
import { createGroup } from '../api.js'
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
    <main className="page centered">
      <div>
        <Link className="linkish" to="/">
          <IconBack />
          Back
        </Link>
        <h1 className="headline headline-tight">
          Start your group&rsquo;s board
        </h1>
      </div>

      <form className="card" onSubmit={submit}>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="field">
          <label className="eyebrow field-label" htmlFor="group-name">
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

        <div className="field">
          <label className="eyebrow field-label" htmlFor="group-roster">
            Who is in <span className="field-label-note">one per line, or separated by commas</span>
          </label>
          <textarea
            id="group-roster"
            className="input"
            value={roster}
            rows={6}
            placeholder={'Dana\nSam\nAlex'}
            onChange={(event) => setRoster(event.target.value)}
          />
          <p className="hint">{rosterHint(names)}</p>
        </div>

        <TurnstileField turnstile={turnstile} />

        <div className="modal-foot">
          <button type="submit" className="btn" disabled={!ready || submitting}>
            {submitting ? 'Creating the board' : 'Create the board'}
          </button>
        </div>
      </form>
    </main>
  )
}

function rosterHint(names) {
  if (names.length === 0) return 'Nobody on the roster yet. Two names is the minimum, because a result needs two sides.'
  if (names.length === 1) return `One name so far. Add at least one more, because a result needs two sides.`
  return `${names.length} names ready. Only these ${names.length} can be picked when a result gets logged, and blanks and repeats were dropped.${
    names.length >= MAX_ROSTER ? ` ${MAX_ROSTER} is the most one board holds.` : ''
  }`
}
