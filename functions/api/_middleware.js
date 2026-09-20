// One error boundary for every /api route, so a failure reaches the client as
// readable JSON instead of an opaque 500 page.

import { SupabaseError } from '../_lib/supabase.js'

// The database enforces its own caps with triggers, as a backstop against a
// runaway script rather than a limit normal use should ever meet. When one
// fires it comes back as a raised exception, which would otherwise surface as
// "something went wrong" and leave the person with no idea what to do.
const DB_CAPS = [
  {
    match: 'roster limit reached',
    status: 409,
    message: 'This board is full. A board holds 50 names, so start another one for the rest.',
  },
  {
    match: 'daily result limit reached',
    status: 429,
    message:
      'This board has hit its limit of 500 results in a day. Nothing was lost, and it can take more tomorrow.',
  },
]

function capFailure(err) {
  if (!(err instanceof SupabaseError) || typeof err.body !== 'string') return null
  return DB_CAPS.find((cap) => err.body.includes(cap.match)) ?? null
}

export async function onRequest(context) {
  try {
    return await context.next()
  } catch (err) {
    const cap = capFailure(err)
    const missingConfig = err instanceof SupabaseError && err.status === 500 && !err.body

    let status = 502
    let message = 'Something went wrong on our side. Nothing was saved, so the board is unchanged.'
    if (cap) {
      status = cap.status
      message = cap.message
    } else if (missingConfig) {
      status = 500
      message = 'This deployment is missing its database settings, so nothing could be read or saved.'
    }

    console.error('api error', err?.name, err?.message, err?.body ?? '')
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    })
  }
}
