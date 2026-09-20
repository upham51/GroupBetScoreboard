import { useEffect, useState } from 'react'
import { fetchMember, fetchHeadToHead } from './api.js'
import { timeAgo } from './format.js'
import { IconTrash } from './icons.jsx'

function Highlight({ label, entry, verb }) {
  if (!entry) return null
  const people = `${verb} ${entry.opponents} ${entry.opponents === 1 ? 'person' : 'people'} on this one`
  return (
    <div className="detail-item">
      <span className="eyebrow">{label}</span>
      <span className="detail-line">{people}</span>
      <span className="detail-sub">
        {[entry.note, timeAgo(entry.created_at)].filter(Boolean).join(' · ')}
      </span>
    </div>
  )
}

function HeadToHead({ slug, member, roster }) {
  const [opponentId, setOpponentId] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const others = roster.filter((r) => r.id !== member.member_id)

  useEffect(() => {
    if (!opponentId) {
      setState({ status: 'idle' })
      return
    }
    let live = true
    setState({ status: 'loading' })
    fetchHeadToHead(slug, member.member_id, opponentId)
      .then((data) => live && setState({ status: 'ok', data }))
      .catch((err) => live && setState({ status: 'error', message: err.message }))
    return () => {
      live = false
    }
  }, [slug, member.member_id, opponentId])

  if (others.length === 0) return null

  return (
    <div className="detail-item">
      <label className="eyebrow" htmlFor={`vs-${member.member_id}`}>
        Head to head
      </label>
      <select
        id={`vs-${member.member_id}`}
        className="input select"
        value={opponentId}
        onChange={(event) => setOpponentId(event.target.value)}
      >
        <option value="">Pick somebody</option>
        {others.map((other) => (
          <option key={other.id} value={other.id}>
            {other.name}
          </option>
        ))}
      </select>

      {state.status === 'loading' ? <span className="detail-sub">Counting them up.</span> : null}
      {state.status === 'error' ? (
        <span className="detail-sub detail-sub-error" role="alert">
          {state.message}
        </span>
      ) : null}
      {state.status === 'ok' ? (
        <span className="detail-line">
          {state.data.member.name} is {state.data.wins} and {state.data.losses} against{' '}
          {state.data.opponent.name}.
        </span>
      ) : null}
    </div>
  )
}

export default function MemberDetail({ slug, member, roster, onRemove }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let live = true
    setState({ status: 'loading' })
    fetchMember(slug, member.member_id)
      .then((data) => live && setState({ status: 'ok', data }))
      .catch((err) => live && setState({ status: 'error', message: err.message }))
    return () => {
      live = false
    }
  }, [slug, member.member_id])

  return (
    <div className="detail">
      <HeadToHead slug={slug} member={member} roster={roster} />

      {state.status === 'loading' ? (
        <span className="detail-sub">Looking up {member.name}&rsquo;s results.</span>
      ) : null}

      {state.status === 'error' ? (
        <span className="detail-sub detail-sub-error" role="alert">
          {state.message}
        </span>
      ) : null}

      {/* Taking somebody off the board is soft: their row goes, their past
          results stay in the history, and anybody can put them back. */}
      {onRemove ? (
        <div className="detail-item">
          <button type="button" className="linkish detail-remove" onClick={() => onRemove(member)}>
            <IconTrash />
            Take {member.name} off the board
          </button>
        </div>
      ) : null}

      {/* A person with no results has no best win and no worst loss, so the
          section is absent rather than an empty box. */}
      {state.status === 'ok' ? (
        <>
          <Highlight label="Best win" entry={state.data.bestWin} verb="Beat" />
          <Highlight label="Worst loss" entry={state.data.worstLoss} verb="Went down against" />
        </>
      ) : null}
    </div>
  )
}
