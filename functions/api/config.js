// GET /api/config -> the public settings the browser needs.
//
// The Turnstile site key is public by design, but it still lives in the Pages
// environment rather than in the client bundle, so it is handed over here. That
// keeps every deployment setting in one place and means no key is baked into a
// build.

import { json, methodNotAllowed } from '../_lib/http.js'

export const onRequestPost = () => methodNotAllowed('GET')

export function onRequestGet({ env }) {
  return json(
    { turnstileSiteKey: env.TURNSTILE_SITE_KEY || null },
    // Public and slow-moving, but short enough that rotating the key does not
    // leave browsers on the old one for long.
    { headers: { 'cache-control': 'public, max-age=300' } },
  )
}
