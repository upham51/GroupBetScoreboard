// POST /api/groups/:slug/bets -> open a bet whose outcome is not known yet.
//
// Same table as a logged result, with settled_at null and every participant's
// side left null. It counts toward nothing until somebody settles it.

import { client } from '../../../_lib/supabase.js'
import { loadGroup } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'
import { cleanNote, cleanStakes } from '../../../_lib/text.js'
import { verifyTurnstile } from '../../../_lib/turnstile.js'
import { idList, rosterOf } from '../../../_lib/participants.js'

export const onRequestGet = () => methodNotAllowed('POST')

export async function onRequestPost({ request, params, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return fail(400, 'That request body was not readable as JSON.')
  }

  const players = idList(payload?.players)
  const note = cleanNote(payload?.note)
  const stakes = cleanStakes(payload?.stakes)

  if (players.length < 2) return fail(400, 'A bet needs at least two people in it.')
  if (!note) return fail(400, 'Say what the bet is.')

  const check = await verifyTurnstile(env, payload?.turnstileToken)
  if (!check.ok) return fail(check.status, check.message)

  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const roster = await rosterOf(db, group.id)
  if (players.some((id) => !roster.has(id))) {
    return fail(400, 'One of those people is not on this roster. Reload the board and try again.')
  }

  // settled_at defaults to now(), so an open bet has to say null out loud.
  const inserted = await db.insert('results', {
    group_id: group.id,
    note,
    stakes,
    settled_at: null,
  })
  const bet = inserted?.[0]
  if (!bet) return fail(502, 'The bet did not save. Nothing was recorded, so try again.')

  try {
    await db.insert(
      'result_participants',
      players.map((member_id) => ({ result_id: bet.id, member_id, side: null })),
      { returning: false },
    )
  } catch (err) {
    await db.remove(`/results?id=eq.${bet.id}`).catch(() => {})
    throw err
  }

  return json({ id: bet.id }, { status: 201 })
}
