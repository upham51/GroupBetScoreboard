// POST /api/groups/:slug/results -> log a result that is already decided.
//
// This is the quick after-the-fact flow and it still works exactly as it did:
// pick winners and losers, it lands settled. results.settled_at defaults to
// now(), so the insert below does not mention it.
//
// Whoever logs it is trusted. There is no dispute flow here by design: this is
// a scoreboard for a friend group, not a ledger. Anything wrong can be removed
// from the History view, which keeps the row and says who removed it from where.

import { client } from '../../../../_lib/supabase.js'
import { loadGroup } from '../../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../../_lib/http.js'
import { cleanNote, cleanStakes } from '../../../../_lib/text.js'
import { verifyTurnstile } from '../../../../_lib/turnstile.js'
import { idList, rosterOf } from '../../../../_lib/participants.js'

export const onRequestGet = () => methodNotAllowed('POST')

export async function onRequestPost({ request, params, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return fail(400, 'That request body was not readable as JSON.')
  }

  const winners = idList(payload?.winners)
  const losers = idList(payload?.losers)
  const note = cleanNote(payload?.note)
  const stakes = cleanStakes(payload?.stakes)

  if (winners.length === 0) return fail(400, 'Pick at least one winner.')
  if (losers.length === 0) return fail(400, 'Pick at least one loser.')
  if (winners.some((id) => losers.includes(id))) {
    return fail(400, 'Somebody is on both sides. Pick one side for each person.')
  }

  // After the cheap checks, so a half-filled form does not burn the token, but
  // before anything touches the database.
  const check = await verifyTurnstile(env, payload?.turnstileToken)
  if (!check.ok) return fail(check.status, check.message)

  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const roster = await rosterOf(db, group.id)
  if ([...winners, ...losers].some((id) => !roster.has(id))) {
    return fail(400, 'One of those people is not on this roster. Reload the board and try again.')
  }

  const inserted = await db.insert('results', { group_id: group.id, note, stakes })
  const result = inserted?.[0]
  if (!result) return fail(502, 'The result did not save. Nothing was recorded, so try again.')

  const participants = [
    ...winners.map((member_id) => ({ result_id: result.id, member_id, side: 'win' })),
    ...losers.map((member_id) => ({ result_id: result.id, member_id, side: 'lose' })),
  ]

  try {
    await db.insert('result_participants', participants, { returning: false })
  } catch (err) {
    // PostgREST has no transaction across two calls, so a half-written result
    // gets cleaned up here rather than sitting on the board as a phantom.
    await db.remove(`/results?id=eq.${result.id}`).catch(() => {})
    throw err
  }

  return json({ id: result.id }, { status: 201 })
}
