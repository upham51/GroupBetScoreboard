// GET /api/groups/:slug/members/:memberId
//   -> that person's best win and worst loss
// GET /api/groups/:slug/members/:memberId?vs=<other member id>
//   -> the head-to-head record between the two
//
// Both shapes come straight from the database functions. Nothing here
// recomputes them.

import { client } from '../../../../_lib/supabase.js'
import { loadGroup } from '../../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../../_lib/http.js'

export const onRequestPost = () => methodNotAllowed('GET')

export async function onRequestGet({ request, params, env }) {
  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const members = await db.select(`/members?group_id=eq.${group.id}&select=id,name`)
  const roster = new Map((members || []).map((m) => [m.id, m.name]))

  const memberId = params.memberId
  if (!roster.has(memberId)) return fail(404, 'That person is not on this roster.')

  const vs = new URL(request.url).searchParams.get('vs')
  if (vs) {
    if (!roster.has(vs)) return fail(400, 'That person is not on this roster.')
    if (vs === memberId) return fail(400, 'Pick somebody other than themselves.')
    const rows = await db.rpc('get_head_to_head', { p_member_a: memberId, p_member_b: vs })
    const row = rows?.[0] ?? { a_wins: 0, b_wins: 0 }
    return json({
      kind: 'head-to-head',
      member: { id: memberId, name: roster.get(memberId) },
      opponent: { id: vs, name: roster.get(vs) },
      wins: Number(row.a_wins) || 0,
      losses: Number(row.b_wins) || 0,
    })
  }

  const [best, worst] = await Promise.all([
    db.rpc('get_best_win', { p_member_id: memberId }),
    db.rpc('get_worst_loss', { p_member_id: memberId }),
  ])

  const shape = (row, countKey) =>
    row
      ? {
          note: row.note || null,
          created_at: row.created_at,
          opponents: Number(row[countKey]) || 0,
        }
      : null

  return json({
    kind: 'member',
    member: { id: memberId, name: roster.get(memberId) },
    // Absent rather than empty: somebody with no wins has no best win, and the
    // view leaves the section out entirely.
    bestWin: shape(best?.[0], 'opponents_beaten'),
    worstLoss: shape(worst?.[0], 'opponents_faced'),
  })
}
