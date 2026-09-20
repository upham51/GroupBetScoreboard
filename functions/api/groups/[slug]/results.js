// POST /api/groups/:slug/results -> log one result.
//
// Whoever holds the link is trusted to log honestly. There is no dispute or
// settlement flow here by design: this is a scoreboard for a friend group, not
// a ledger. The only checks below are the ones that keep the board coherent
// (both sides present, nobody on both sides, everyone actually on the roster).

import { client } from '../../../_lib/supabase.js'
import { loadGroup, loadSeasons, activeSeasonOf } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'
import { cleanNote } from '../../../_lib/text.js'
import { verifyTurnstile } from '../../../_lib/turnstile.js'

export const onRequestGet = () => methodNotAllowed('POST')

function idList(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  for (const raw of input) {
    if (typeof raw === 'string' && raw) seen.add(raw)
  }
  return [...seen]
}

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

  if (winners.length === 0) return fail(400, 'Pick at least one winner.')
  if (losers.length === 0) return fail(400, 'Pick at least one loser.')
  const overlap = winners.filter((id) => losers.includes(id))
  if (overlap.length > 0) return fail(400, 'Somebody is on both sides. Pick one side for each person.')

  // After the cheap checks, so a half-filled form does not burn the token, but
  // before anything touches the database.
  const check = await verifyTurnstile(env, payload?.turnstileToken)
  if (!check.ok) return fail(check.status, check.message)

  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const members = await db.select(`/members?group_id=eq.${group.id}&select=id`)
  const roster = new Set((members || []).map((m) => m.id))
  const unknown = [...winners, ...losers].filter((id) => !roster.has(id))
  if (unknown.length > 0) {
    return fail(400, 'One of those people is not on this roster. Reload the board and try again.')
  }

  // Results belong to whichever season is running when they are logged. With
  // no season running, season_id stays null and the result only ever counts
  // toward all-time.
  const activeSeason = activeSeasonOf(await loadSeasons(env, group.id))
  const inserted = await db.insert('results', {
    group_id: group.id,
    note,
    season_id: activeSeason?.id ?? null,
  })
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
