// Serves the built index.html with this group's share meta tags injected.
//
// Chat apps and link unfurlers do not run JavaScript, so og:title, og:image and
// friends cannot be set by React after the fact. These two routes take the
// static Vite output from the ASSETS binding and rewrite the head on the way
// past, which is what makes pasting a group link into iMessage show the live
// board instead of a generic card.
//
// The board data the function already fetched is also inlined into the page, so
// the client paints real standings on first load rather than a spinner.

import { loadBoard } from './board.js'

const escapeAttr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Safe to drop inside a <script> element: the sequences that could end the
// element early or open a comment are escaped. U+2028 and U+2029 are valid in
// JSON but are line terminators in JavaScript, so they go out escaped too.
// The pattern is built from char codes to keep this file pure ASCII.
const LINE_SEPARATORS = new RegExp('[' + String.fromCharCode(0x2028, 0x2029) + ']', 'g')

const escapeJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(LINE_SEPARATORS, (ch) => (ch.charCodeAt(0) === 0x2028 ? '\\u2028' : '\\u2029'))

export async function serveShell(context, { view }) {
  const { request, env, params } = context
  const origin = new URL(request.url).origin
  const slug = params.slug

  let board = null
  let loadFailed = false
  try {
    board = await loadBoard(env, slug)
  } catch (err) {
    console.error('shell: could not load board', err?.message, err?.body ?? '')
    loadFailed = true
  }

  const asset = await env.ASSETS.fetch(new URL('/index.html', origin))
  if (!asset.ok) return asset

  const title = board ? `${board.group.name} scoreboard` : 'Group scoreboard'
  const description = board
    ? `${board.summary.headline} ${board.summary.detail}`
    : 'A shared scoreboard for the bets your group already runs.'
  const canonical = `${origin}/g/${encodeURIComponent(slug)}`
  const image = `${origin}/og/${encodeURIComponent(slug)}`

  const meta = [
    `<meta name="description" content="${escapeAttr(description)}">`,
    // Group boards are private by convention, shared as a link in a chat. Keep
    // them out of search results; link unfurlers are unaffected.
    '<meta name="robots" content="noindex">',
    `<link rel="canonical" href="${escapeAttr(canonical)}">`,
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="Group scoreboard">`,
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(canonical)}">`,
    ...(board
      ? [
          `<meta property="og:image" content="${escapeAttr(image)}">`,
          '<meta property="og:image:type" content="image/png">',
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          `<meta property="og:image:alt" content="${escapeAttr(`${board.group.name} standings`)}">`,
          '<meta name="twitter:card" content="summary_large_image">',
          `<meta name="twitter:image" content="${escapeAttr(image)}">`,
        ]
      : []),
    `<meta name="twitter:title" content="${escapeAttr(title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(description)}">`,
    `<script id="board-state" type="application/json">${escapeJson({
      view,
      slug,
      board,
      status: board ? 'ok' : loadFailed ? 'error' : 'missing',
    })}</script>`,
  ].join('')

  const rewritten = new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(title)
      },
    })
    .on('head', {
      element(el) {
        el.append(meta, { html: true })
      },
    })
    .transform(asset)

  return new Response(rewritten.body, {
    status: board ? 200 : loadFailed ? 503 : 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // The preview card and the injected standings both go stale the moment
      // somebody logs a result.
      'cache-control': 'no-store',
    },
  })
}
