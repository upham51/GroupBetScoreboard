// GET /api/groups/:slug -> the board data the client renders.

import { loadBoard } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'

export const onRequestPost = () => methodNotAllowed('GET')

export async function onRequestGet({ request, params, env }) {
  // ?scope=all pins the board to all-time, ?scope=<season id> to one season.
  // Without it the board shows the active season when there is one.
  const scope = new URL(request.url).searchParams.get('scope') || undefined
  const board = await loadBoard(env, params.slug, { scope })
  if (!board) return fail(404, 'No board with that link.')
  return json(board)
}
