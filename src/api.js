// Every read and write goes through the Pages Functions in /functions, so the
// Supabase anon key never reaches the browser bundle.

async function send(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('The connection dropped, so nothing was sent. Check your signal and try again.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const err = new Error(data?.error || 'That did not go through. Nothing was saved.')
    err.status = res.status
    throw err
  }
  return data
}

export const createGroup = (name, roster, turnstileToken) =>
  send('/api/groups', { method: 'POST', body: { name, roster, turnstileToken } })

export const fetchBoard = (slug) => send(`/api/groups/${encodeURIComponent(slug)}`)

export const logResult = (slug, payload, turnstileToken) =>
  send(`/api/groups/${encodeURIComponent(slug)}/results`, {
    method: 'POST',
    body: { ...payload, turnstileToken },
  })

export const fetchMember = (slug, memberId) =>
  send(`/api/groups/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`)

export const fetchHeadToHead = (slug, memberId, opponentId) =>
  send(
    `/api/groups/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}` +
      `?vs=${encodeURIComponent(opponentId)}`,
  )

export const fetchHistory = (slug) => send(`/api/groups/${encodeURIComponent(slug)}/history`)

export const fetchStats = (slug) => send(`/api/groups/${encodeURIComponent(slug)}/stats`)

export const createBet = (slug, payload, turnstileToken) =>
  send(`/api/groups/${encodeURIComponent(slug)}/bets`, {
    method: 'POST',
    body: { ...payload, turnstileToken },
  })

const patchResult = (slug, resultId, body) =>
  send(`/api/groups/${encodeURIComponent(slug)}/results/${encodeURIComponent(resultId)}`, {
    method: 'PATCH',
    body,
  })

export const settleBet = (slug, betId, payload, turnstileToken) =>
  patchResult(slug, betId, { action: 'settle', ...payload, turnstileToken })

export const hideResult = (slug, resultId) => patchResult(slug, resultId, { action: 'hide' })
export const restoreResult = (slug, resultId) => patchResult(slug, resultId, { action: 'restore' })

const patchMember = (slug, memberId, body) =>
  send(`/api/groups/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body,
  })

export const hideMember = (slug, memberId) => patchMember(slug, memberId, { action: 'hide' })
export const restoreMember = (slug, memberId) => patchMember(slug, memberId, { action: 'restore' })
