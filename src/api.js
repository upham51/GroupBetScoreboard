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

export const createGroup = (name, roster) => send('/api/groups', { method: 'POST', body: { name, roster } })

export const fetchBoard = (slug) => send(`/api/groups/${encodeURIComponent(slug)}`)

export const logResult = (slug, payload) =>
  send(`/api/groups/${encodeURIComponent(slug)}/results`, { method: 'POST', body: payload })
