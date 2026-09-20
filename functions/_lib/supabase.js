// Minimal PostgREST client.
//
// The whole server surface is four table reads and three inserts, so this talks
// to Supabase's REST endpoint with fetch rather than pulling in supabase-js.
// That keeps the Pages Functions bundle small and avoids shipping a client
// library into the Workers runtime for no benefit.
//
// SUPABASE_URL and SUPABASE_ANON_KEY come from the Cloudflare Pages environment
// variable settings. They are never bundled into the browser build: the client
// reads and writes through /api/* instead, so the anon key stays server-side.

export class SupabaseError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'SupabaseError'
    this.status = status
    this.body = body
  }
}

export function client(env) {
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new SupabaseError('SUPABASE_URL and SUPABASE_ANON_KEY are not set on this deployment.', 500)
  }
  const base = `${url.replace(/\/+$/, '')}/rest/v1`

  async function request(path, { method = 'GET', body, prefer, raw = false } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        accept: 'application/json',
        ...(prefer ? { prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      throw new SupabaseError(`Supabase ${method} ${path} failed with ${res.status}.`, res.status, text)
    }
    const data = text ? JSON.parse(text) : null
    return raw ? { data, headers: res.headers } : data
  }

  // PostgREST reports the unpaginated row count in Content-Range as
  // "0-4/17" when asked with Prefer: count=exact. Used so the board can say how
  // many results exist without reading every row back.
  async function selectWithCount(path) {
    const { data, headers } = await request(path, { prefer: 'count=exact', raw: true })
    const range = headers.get('content-range') || ''
    const total = Number.parseInt(range.split('/')[1] ?? '', 10)
    return { rows: data || [], count: Number.isFinite(total) ? total : (data || []).length }
  }

  return {
    select: (path) => request(path),
    selectWithCount,
    insert: (table, rows, { returning = true } = {}) =>
      request(`/${table}`, {
        method: 'POST',
        body: rows,
        prefer: returning ? 'return=representation' : 'return=minimal',
      }),
    remove: (path) => request(path, { method: 'DELETE', prefer: 'return=minimal' }),
  }
}
