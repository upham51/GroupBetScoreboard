// Cloudflare Turnstile verification.
//
// Both write actions in this app (creating a group, logging a result) carry a
// Turnstile token that is checked here before anything is inserted. There are
// no accounts, so this is the only thing standing between the open write
// endpoints and a script.
//
// TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY come from the Cloudflare Pages
// environment variable settings. The site key is public by design and is handed
// to the browser by /api/config; the secret key never leaves the function.

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// A deployment with no secret configured refuses to write rather than waving
// everything through. A guardrail that silently does nothing is worse than one
// that is visibly off, and this matches how the app already behaves when its
// database settings are missing.
export const NOT_CONFIGURED =
  'This deployment is missing its abuse-check settings, so nothing could be saved.'

export async function verifyTurnstile(env, token) {
  const secret = env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { ok: false, status: 500, message: NOT_CONFIGURED }
  }
  if (typeof token !== 'string' || !token) {
    return {
      ok: false,
      status: 400,
      message: 'The browser check did not finish. Wait for it to tick over, then try again.',
    }
  }

  let outcome
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // remoteip is deliberately left out. It is optional, and sending it turns
      // an ordinary network change between solving the challenge and pressing
      // the button into a rejection, which buys little here: the token is
      // already single-use, short-lived and tied to the site key.
      body: JSON.stringify({ secret, response: token }),
    })
    outcome = await res.json()
  } catch {
    return {
      ok: false,
      status: 502,
      message: 'The browser check could not be reached. Nothing was saved, so try again.',
    }
  }

  if (outcome?.success) return { ok: true }

  const codes = Array.isArray(outcome?.['error-codes']) ? outcome['error-codes'] : []
  console.warn('turnstile rejected a submission', codes.join(',') || 'no error code')

  // A token is good once. The usual cause of a rejection on a real submission
  // is a token that was already spent or has aged out, and the fix for the
  // person is the same either way: the widget runs again and they resubmit.
  const stale = codes.includes('timeout-or-duplicate')
  return {
    ok: false,
    status: 403,
    message: stale
      ? 'That browser check had already been used. It has been reset, so try again.'
      : 'The browser check did not pass. It has been reset, so try again.',
  }
}
