// PATCH /api/groups/:slug/seasons/:seasonId -> end that season.
//
// Ending it freezes a champion onto the season row: whoever has the top net
// record over the results logged while it was running. The standings come from
// get_standings scoped to the season, so the champion is decided by the same
// maths as the board.

import { client } from '../../../../_lib/supabase.js'
import { loadGroup, rank } from '../../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../../_lib/http.js'

export const onRequestGet = () => methodNotAllowed('PATCH')
export const onRequestPost = () => methodNotAllowed('PATCH')

export async function onRequestPatch({ params, env }) {
  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const found = await db.select(
    `/seasons?id=eq.${encodeURIComponent(params.seasonId)}&group_id=eq.${group.id}&select=id,name,ended_at&limit=1`,
  )
  const season = found?.[0]
  if (!season) return fail(404, 'No season with that id on this board.')
  if (season.ended_at) return fail(409, `${season.name} has already ended.`)

  const rows = await db.rpc('get_standings', { p_group_id: group.id, p_season_id: season.id })
  const standings = rank(
    (rows || []).map((r) => ({
      member_id: r.member_id,
      name: r.name,
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      net: Number(r.net) || 0,
    })),
  )

  // A season nobody played in closes with no champion rather than crowning
  // somebody at 0-0. A tie at the top is broken the same way the board breaks
  // it: more wins first, then name.
  const winner = standings.find((r) => r.rank === 1 && r.wins > 0) ?? null

  const updated = await db.patch(
    `/seasons?id=eq.${season.id}`,
    {
      ended_at: new Date().toISOString(),
      champion_member_id: winner?.member_id ?? null,
      champion_net: winner?.net ?? null,
    },
  )
  const row = updated?.[0]

  return json({
    id: season.id,
    name: season.name,
    ended_at: row?.ended_at ?? null,
    champion: winner ? { id: winner.member_id, name: winner.name } : null,
    champion_net: winner?.net ?? null,
  })
}
