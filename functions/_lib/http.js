// Small response helpers shared by every function route.

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Boards change whenever someone logs a result, so never let a cache
      // hold a stale scoreboard.
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

export function fail(status, message) {
  return json({ error: message }, { status })
}

export function methodNotAllowed(allow) {
  return new Response(JSON.stringify({ error: `Use ${allow} here.` }), {
    status: 405,
    headers: { 'content-type': 'application/json; charset=utf-8', allow },
  })
}
