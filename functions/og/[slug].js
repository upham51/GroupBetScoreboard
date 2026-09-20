// GET /og/:slug -> the group's live standings as a 1200x630 PNG.
//
// Referenced from the board page's og:image tag, so pasting a group's own link
// into a chat renders the current board as the preview card.
//
// Regenerated on every request rather than cached: the data is a handful of rows
// and a stale scoreboard in a link preview is worse than the render cost.

import { loadBoard } from '../_lib/board.js'
import { renderBoardPng, OG_WIDTH, OG_HEIGHT } from '../_lib/og.js'

export async function onRequestGet({ params, env }) {
  let board
  try {
    board = await loadBoard(env, params.slug)
  } catch (err) {
    console.error('og: could not load board', err?.message, err?.body ?? '')
    return new Response('The board could not be read.', { status: 502 })
  }
  if (!board) return new Response('No board with that link.', { status: 404 })

  let png
  try {
    png = await renderBoardPng(board)
  } catch (err) {
    console.error('og: render failed', err?.message)
    return new Response('The share image could not be rendered.', { status: 500 })
  }

  return new Response(png, {
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.byteLength),
      'cache-control': 'no-store',
      'x-image-size': `${OG_WIDTH}x${OG_HEIGHT}`,
    },
  })
}
