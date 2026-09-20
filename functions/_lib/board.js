// Loads and shapes a group's board. Shared by the JSON API, the OG image
// function, and the HTML shell that injects share meta tags, so all of them
// agree on the order, the ranking, and the sentence under the panel.
//
// Every statistic comes from a database function. Nothing here recomputes wins,
// losses, net, streaks or rivalries; it orders rows, ranks them, and drops
// anything that has been removed from the board.

import { client } from './supabase.js'

export function formatNet(net) {
  return net > 0 ? `+${net}` : String(net)
}

export function rank(rows) {
  // Net record descending, then more wins first, then name. Ties share a rank.
  const sorted = [...rows].sort(
    (a, b) => b.net - a.net || b.wins - a.wins || a.name.localeCompare(b.name),
  )
  let lastNet = null
  let lastRank = 0
  return sorted.map((row, i) => {
    if (row.net !== lastNet) {
      lastNet = row.net
      lastRank = i + 1
    }
    return { ...row, rank: lastRank }
  })
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function summarize(standings, resultCount, activeCount) {
  const pending = activeCount > 0 ? ` ${plural(activeCount, 'bet')} still open.` : ''
  if (resultCount === 0) {
    return {
      headline: 'No results logged yet.',
      detail:
        (standings.length > 0
          ? `${plural(standings.length, 'name')} on the roster and nothing to separate them.`
          : 'This board has no roster yet.') + pending,
    }
  }
  const volume = plural(resultCount, 'result')
  const leaders = standings.filter((r) => r.rank === 1)
  const runnerUp = standings.find((r) => r.rank !== 1)

  if (leaders.length === 1 && runnerUp) {
    const gap = leaders[0].net - runnerUp.net
    return {
      headline: `${leaders[0].name} leads by ${gap}.`,
      detail: `${volume} settled. ${runnerUp.name} is second at ${formatNet(runnerUp.net)}.${pending}`,
    }
  }
  if (leaders.length === 2) {
    return {
      headline: `${leaders[0].name} and ${leaders[1].name} are tied at ${formatNet(leaders[0].net)}.`,
      detail: `${volume} settled. The next one breaks the tie.${pending}`,
    }
  }
  if (leaders.length > 2) {
    return {
      headline: `${leaders.length} people are tied at ${formatNet(leaders[0].net)}.`,
      detail: `${volume} settled. Nobody has pulled ahead.${pending}`,
    }
  }
  return {
    headline: `${leaders[0].name} is at ${formatNet(leaders[0].net)}.`,
    detail: `${volume} settled.${pending}`,
  }
}

// Gold is reserved, so the first-place row only gets it when there is a single
// clear leader with a winning record. Co-leaders and an all-even board get none.
function leaderMemberId(standings, resultCount) {
  if (resultCount === 0) return null
  const leaders = standings.filter((r) => r.rank === 1)
  if (leaders.length !== 1 || leaders[0].net <= 0) return null
  return leaders[0].member_id
}

export async function loadGroup(env, slug) {
  const db = client(env)
  const rows = await db.select(
    `/groups?slug=eq.${encodeURIComponent(slug)}&select=id,slug,name,created_at&limit=1`,
  )
  return rows?.[0] ?? null
}

export const RESULT_SELECT =
  'id,note,stakes,created_at,settled_at,hidden_at,hidden_city,hidden_region,result_participants(member_id,side)'

// Turns a result row plus the roster into something the views can render.
function shapeResult(row, nameOf) {
  const named = (side) =>
    (row.result_participants || [])
      .filter((p) => p.side === side)
      .map((p) => ({ id: p.member_id, name: nameOf.get(p.member_id) ?? 'Someone' }))
  return {
    id: row.id,
    note: row.note || null,
    stakes: row.stakes || null,
    created_at: row.created_at,
    settled_at: row.settled_at,
    winners: named('win'),
    losers: named('lose'),
    // An active bet names people without taking a side for any of them.
    players: (row.result_participants || []).map((p) => ({
      id: p.member_id,
      name: nameOf.get(p.member_id) ?? 'Someone',
      side: p.side ?? null,
    })),
  }
}

// Only members who could possibly hold a streak of three are asked for one, so
// a large roster does not turn into a call per name for no reason.
const STREAK_FLOOR = 3

export async function loadBoard(env, slug) {
  const group = await loadGroup(env, slug)
  if (!group) return null
  const db = client(env)

  // Removed members are gone from the board, so the visible roster is the
  // source of truth for who belongs on it.
  const [visibleMembers, standingsRows, activeRows, settled, rivalryRows, earliest] = await Promise.all([
    db.select(`/members?group_id=eq.${group.id}&hidden_at=is.null&select=id,name&order=name.asc`),
    db.rpc('get_standings', { p_group_id: group.id }),
    db.select(
      `/results?group_id=eq.${group.id}&settled_at=is.null&hidden_at=is.null&select=${RESULT_SELECT}&order=created_at.desc`,
    ),
    db.selectWithCount(
      `/results?group_id=eq.${group.id}&settled_at=not.is.null&hidden_at=is.null&select=${RESULT_SELECT}&order=settled_at.desc&limit=50`,
    ),
    db.rpc('get_closest_rivalry', { p_group_id: group.id }),
    db.select(
      `/results?group_id=eq.${group.id}&settled_at=not.is.null&hidden_at=is.null&select=settled_at&order=settled_at.asc&limit=1`,
    ),
  ])

  const roster = (visibleMembers || []).map((m) => ({ id: m.id, name: m.name }))
  const visible = new Set(roster.map((m) => m.id))
  const nameOf = new Map(roster.map((m) => [m.id, m.name]))

  // get_standings returns every member of the group, removed ones included, so
  // the removed names are dropped here.
  const standings = rank(
    (standingsRows || [])
      .filter((r) => visible.has(r.member_id))
      .map((r) => ({
        member_id: r.member_id,
        name: r.name,
        wins: Number(r.wins) || 0,
        losses: Number(r.losses) || 0,
        net: Number(r.net) || 0,
      })),
  )

  const streakRows = await Promise.all(
    standings
      .filter((r) => r.wins + r.losses >= STREAK_FLOOR)
      .map((r) =>
        db
          .rpc('get_current_streak', { p_member_id: r.member_id })
          .then((rows) => [r.member_id, rows?.[0] ?? null]),
      ),
  )
  const streaks = {}
  for (const [memberId, row] of streakRows) {
    const length = Number(row?.streak_length) || 0
    if (row && (row.streak_side === 'win' || row.streak_side === 'lose') && length >= STREAK_FLOOR) {
      streaks[memberId] = { side: row.streak_side, length }
    }
  }

  const activeBets = (activeRows || []).map((row) => shapeResult(row, nameOf))
  const pastResults = (settled.rows || []).map((row) => shapeResult(row, nameOf))
  const resultCount = settled.count

  // A rivalry naming somebody who has been removed would read as a ghost, so it
  // is only shown while both people are still on the board.
  const raw = rivalryRows?.[0]
  const rivalry =
    raw && visible.has(raw.member_a) && visible.has(raw.member_b)
      ? {
          a: { id: raw.member_a, name: raw.member_a_name },
          b: { id: raw.member_b, name: raw.member_b_name },
          a_wins: Number(raw.a_wins) || 0,
          b_wins: Number(raw.b_wins) || 0,
          total_meetings: Number(raw.total_meetings) || 0,
        }
      : null

  return {
    group: { slug: group.slug, name: group.name, created_at: group.created_at },
    standings,
    roster,
    streaks,
    rivalry,
    activeBets,
    pastResults,
    resultCount,
    latestResult: pastResults[0] ?? null,
    leaderMemberId: leaderMemberId(standings, resultCount),
    summary: summarize(standings, resultCount, activeBets.length),
    coverage: {
      // Asked for directly: pastResults is only the most recent page, so its
      // last row is not necessarily the oldest result on the board.
      first_result_at: earliest?.[0]?.settled_at ?? null,
      last_result_at: pastResults[0]?.settled_at ?? null,
    },
  }
}
