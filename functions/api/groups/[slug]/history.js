// GET /api/groups/:slug/history -> everything that has been removed from this
// board, newest first, results and people together.
//
// This is what makes deletion accountable in an app with no accounts: the row
// is still here, it says roughly where it was removed from, and anybody can put
// it back.

import { client } from '../../../_lib/supabase.js'
import { loadGroup, RESULT_SELECT } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'
import { placeOf } from '../../../_lib/hide.js'

export const onRequestPost = () => methodNotAllowed('GET')

function describe(result, nameOf) {
  const named = (side) =>
    (result.result_participants || [])
      .filter((p) => p.side === side)
      .map((p) => nameOf.get(p.member_id) ?? 'Someone')
  const winners = named('win')
  const losers = named('lose')
  const join = (list) =>
    list.length <= 1
      ? list[0] ?? ''
      : list.length === 2
        ? `${list[0]} and ${list[1]}`
        : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`

  if (!result.settled_at) {
    const everyone = (result.result_participants || []).map((p) => nameOf.get(p.member_id) ?? 'Someone')
    return result.note ? `${result.note} (${join(everyone)})` : `Open bet between ${join(everyone)}`
  }
  if (winners.length && losers.length) return `${join(winners)} beat ${join(losers)}`
  return result.note || 'A result'
}

export async function onRequestGet({ params, env }) {
  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const [allMembers, hiddenResults, hiddenMembers] = await Promise.all([
    // Every member, removed ones included, so a hidden result can still name
    // somebody who has also been removed.
    db.select(`/members?group_id=eq.${group.id}&select=id,name`),
    db.select(
      `/results?group_id=eq.${group.id}&hidden_at=not.is.null&select=${RESULT_SELECT}&order=hidden_at.desc`,
    ),
    db.select(
      `/members?group_id=eq.${group.id}&hidden_at=not.is.null&select=id,name,hidden_at,hidden_city,hidden_region&order=hidden_at.desc`,
    ),
  ])

  const nameOf = new Map((allMembers || []).map((m) => [m.id, m.name]))

  const items = [
    ...(hiddenResults || []).map((r) => ({
      kind: r.settled_at ? 'result' : 'bet',
      id: r.id,
      label: describe(r, nameOf),
      stakes: r.stakes || null,
      hidden_at: r.hidden_at,
      place: placeOf(r.hidden_city, r.hidden_region),
    })),
    ...(hiddenMembers || []).map((m) => ({
      kind: 'member',
      id: m.id,
      label: m.name,
      stakes: null,
      hidden_at: m.hidden_at,
      place: placeOf(m.hidden_city, m.hidden_region),
    })),
  ].sort((a, b) => new Date(b.hidden_at) - new Date(a.hidden_at))

  return json({ items })
}
