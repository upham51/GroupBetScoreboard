// GET /api/groups/:slug/stats -> the three things the Stats view needs that
// the board payload cannot give it.
//
// Win rate, the hottest and coldest runs and the settled count all come
// straight out of the board, so they are not repeated here. What is left needs
// the results themselves: the most lopsided result on the board, how many
// settled bets named stakes, and the pairs who keep meeting.
//
// The grudge tally is the same shape as get_closest_rivalry, which returns only
// the single tightest pair. Rather than add a database function for the top
// three, the pairs are counted here from results that have already been
// fetched.

import { client } from '../../../_lib/supabase.js'
import { loadGroup, RESULT_SELECT } from '../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../_lib/http.js'

export const onRequestPost = () => methodNotAllowed('GET')

// A board can hold 500 results in a day and more over its life. Reading every
// one of them to draw two cards is not worth it, so this looks at the most
// recent slice and says so when there is more behind it.
const WINDOW = 500

function join(list) {
  if (list.length === 0) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export async function onRequestGet({ params, env }) {
  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const db = client(env)
  const [visibleMembers, rows] = await Promise.all([
    db.select(`/members?group_id=eq.${group.id}&hidden_at=is.null&select=id,name`),
    db.select(
      `/results?group_id=eq.${group.id}&settled_at=not.is.null&hidden_at=is.null` +
        `&select=${RESULT_SELECT}&order=settled_at.desc&limit=${WINDOW}`,
    ),
  ])

  // Somebody taken off the board is off it everywhere, so a result that only
  // names removed people has nothing left to show.
  const nameOf = new Map((visibleMembers || []).map((m) => [m.id, m.name]))
  const results = rows || []

  let blowout = null
  let owed = 0
  const pairs = new Map()

  for (const row of results) {
    const parts = row.result_participants || []
    const winners = parts.filter((p) => p.side === 'win' && nameOf.has(p.member_id))
    const losers = parts.filter((p) => p.side === 'lose' && nameOf.has(p.member_id))
    if (winners.length === 0 || losers.length === 0) continue

    if (row.stakes) owed += 1

    // The most one-sided result on the board: the one where the most people
    // were on the losing end of it. Ordered newest first, so the first one to
    // reach a given margin is also the most recent.
    if (!blowout || losers.length > blowout.losers.length) {
      blowout = {
        winners: winners.map((p) => nameOf.get(p.member_id)),
        losers: losers.map((p) => nameOf.get(p.member_id)),
        note: row.note || null,
        stakes: row.stakes || null,
        settled_at: row.settled_at,
      }
    }

    for (const w of winners) {
      for (const l of losers) {
        const [x, y] = w.member_id < l.member_id ? [w.member_id, l.member_id] : [l.member_id, w.member_id]
        const key = `${x}|${y}`
        const tally = pairs.get(key) || { x, y, xWins: 0, yWins: 0, total: 0 }
        if (w.member_id === x) tally.xWins += 1
        else tally.yWins += 1
        tally.total += 1
        pairs.set(key, tally)
      }
    }
  }

  const grudges = [...pairs.values()]
    // The pairs who keep coming back to each other, tightest first when the
    // count is level. A pair who have met once is not a grudge.
    .filter((p) => p.total >= 2)
    .sort((a, b) => b.total - a.total || Math.abs(a.xWins - a.yWins) - Math.abs(b.xWins - b.yWins))
    .slice(0, 4)
    .map((p) => ({
      pair: `${nameOf.get(p.x)} vs ${nameOf.get(p.y)}`,
      a: p.xWins,
      b: p.yWins,
      total: p.total,
    }))

  return json({
    owed,
    grudges,
    blowout: blowout
      ? {
          headline: `${join(blowout.winners)} beat ${join(blowout.losers)}`,
          losers: blowout.losers.length,
          note: blowout.note,
          stakes: blowout.stakes,
          settled_at: blowout.settled_at,
        }
      : null,
    // True when there are older results this did not look at, so the view can
    // say what the numbers cover instead of overstating them.
    window: WINDOW,
    truncated: results.length === WINDOW,
  })
}
