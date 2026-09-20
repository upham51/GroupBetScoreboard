// GET /api/groups/:slug -> the board data the client renders.

import { loadBoard } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'

export const onRequestPost = () => methodNotAllowed('GET')

export async function onRequestGet({ params, env }) {
  const board = await loadBoard(env, params.slug)
  if (!board) return fail(404, 'No board with that link.')
  return json(board)
}
