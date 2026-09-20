// One error boundary for every /api route, so a failure reaches the client as
// readable JSON instead of an opaque 500 page.

import { SupabaseError } from '../_lib/supabase.js'

export async function onRequest(context) {
  try {
    return await context.next()
  } catch (err) {
    const missingConfig = err instanceof SupabaseError && err.status === 500 && !err.body
    const message = missingConfig
      ? 'This deployment is missing its database settings, so nothing could be read or saved.'
      : 'Something went wrong on our side. Nothing was saved, so the board is unchanged.'
    console.error('api error', err?.name, err?.message, err?.body ?? '')
    return new Response(JSON.stringify({ error: message }), {
      status: missingConfig ? 500 : 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    })
  }
}
