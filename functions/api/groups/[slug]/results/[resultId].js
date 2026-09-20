// PATCH /api/groups/:slug/results/:resultId
//
//   { action: 'settle', winners, losers }  decide an open bet
//   { action: 'hide' }                     remove it from the board
//   { action: 'restore' }                  put it back
//
// Anyone can do any of these. There is no login and no admin, on purpose. What
// makes it safe is that nothing is destroyed: hiding is a flag plus the city
// the request came from, and the History view shows it with a way back.

import { client } from '../../../../_lib/supabase.js'
import { loadGroup } from '../../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../../_lib/http.js'
import { verifyTurnstile } from '../../../../_lib/turnstile.js'
import { hidePatch, RESTORE_PATCH } from '../../../../_lib/hide.js'
import { idList } from '../../../../_lib/participants.js'

export const onRequestGet = () => methodNotAllowed('PATCH')
export const onRequestPost = () => methodNotAllowed('PATCH')

export async function onRequestPatch({ request, params, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return fail(400, 'That request body was not readable as JSON.')
  }
  const action = payload?.action

  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const found = await db.select(
    `/results?id=eq.${encodeURIComponent(params.resultId)}&group_id=eq.${group.id}` +
      `&select=id,settled_at,hidden_at,result_participants(member_id)&limit=1`,
  )
  const result = found?.[0]
  if (!result) return fail(404, 'Nothing on this board with that id.')

  if (action === 'hide') {
    if (result.hidden_at) return json({ id: result.id, hidden: true })
    await db.patch(`/results?id=eq.${result.id}`, hidePatch(request))
    return json({ id: result.id, hidden: true })
  }

  if (action === 'restore') {
    await db.patch(`/results?id=eq.${result.id}`, RESTORE_PATCH)
    return json({ id: result.id, hidden: false })
  }

  if (action !== 'settle') {
    return fail(400, 'Say whether to settle, hide or restore this one.')
  }

  if (result.settled_at) return fail(409, 'That bet has already been settled.')
  if (result.hidden_at) return fail(409, 'That bet was removed. Restore it before settling it.')

  const winners = idList(payload?.winners)
  const losers = idList(payload?.losers)
  if (winners.length === 0) return fail(400, 'Pick at least one winner.')
  if (losers.length === 0) return fail(400, 'Pick at least one loser.')
  if (winners.some((id) => losers.includes(id))) {
    return fail(400, 'Somebody is on both sides. Pick one side for each person.')
  }

  // Settling can only decide the people already named on the bet, and it has to
  // decide all of them: a settled result with somebody left undecided would sit
  // in the standings counting for nothing and read as a bug.
  const named = new Set((result.result_participants || []).map((p) => p.member_id))
  const picked = [...winners, ...losers]
  if (picked.some((id) => !named.has(id))) {
    return fail(400, 'Only the people already on this bet can win or lose it.')
  }
  if (picked.length !== named.size) {
    return fail(400, 'Give everybody on this bet a side before settling it.')
  }

  const check = await verifyTurnstile(env, payload?.turnstileToken)
  if (!check.ok) return fail(check.status, check.message)

  // Sides first: a result marked settled with nobody's side filled in would be
  // counted by the standings functions as it was being written.
  for (const [side, ids] of [['win', winners], ['lose', losers]]) {
    if (ids.length === 0) continue
    await db.patch(
      `/result_participants?result_id=eq.${result.id}&member_id=in.(${ids.join(',')})`,
      { side },
    )
  }
  await db.patch(`/results?id=eq.${result.id}`, { settled_at: new Date().toISOString() })

  return json({ id: result.id, settled: true })
}
