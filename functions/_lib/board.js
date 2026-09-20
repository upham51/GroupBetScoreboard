// Loads and shapes a group's board. Shared by the JSON API, the OG image
// function, and the HTML shell that injects share meta tags, so all three agree
// on the scope, the order, the ranking, and the sentence under the panel.
//
// The standings maths lives in the database function get_standings. Nothing
// here recomputes wins, losses or net; it only orders the rows, ranks them, and
// reconciles them with the roster.

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

// One sentence that says what the numbers mean, plus one of supporting detail.
// The board, the screenshot view, the OG image, and og:description all use it.
function summarize(standings, resultCount) {
  if (resultCount === 0) {
    return {
      headline: 'No results logged yet.',
      detail:
        standings.length > 0
          ? `${plural(standings.length, 'name')} on the roster and nothing to separate them.`
          : 'This board has no roster yet.',
    }
  }
  const volume = plural(resultCount, 'result')
  const leaders = standings.filter((r) => r.rank === 1)
  const runnerUp = standings.find((r) => r.rank !== 1)

  if (leaders.length === 1 && runnerUp) {
    const gap = leaders[0].net - runnerUp.net
    return {
      headline: `${leaders[0].name} leads by ${gap}.`,
      detail: `${volume} logged. ${runnerUp.name} is second at ${formatNet(runnerUp.net)}.`,
    }
  }
  if (leaders.length === 2) {
    return {
      headline: `${leaders[0].name} and ${leaders[1].name} are tied at ${formatNet(leaders[0].net)}.`,
      detail: `${volume} logged. The next one breaks the tie.`,
    }
  }
  if (leaders.length > 2) {
    return {
      headline: `${leaders.length} people are tied at ${formatNet(leaders[0].net)}.`,
      detail: `${volume} logged. Nobody has pulled ahead.`,
    }
  }
  return {
    headline: `${leaders[0].name} is at ${formatNet(leaders[0].net)}.`,
    detail: `${volume} logged.`,
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

export async function loadSeasons(env, groupId) {
  const db = client(env)
  const rows = await db.select(
    `/seasons?group_id=eq.${groupId}&select=id,name,started_at,ended_at,champion_member_id,champion_net&order=started_at.desc`,
  )
  return rows || []
}

export function activeSeasonOf(seasons) {
  return seasons.find((s) => !s.ended_at) ?? null
}

// Turns the standings rows the database returned into a ranked board.
//
// get_standings scoped to a season only returns members who played in it, so a
// member who has not shown up yet would vanish from the board mid-season. The
// roster is the source of truth for who belongs on the list, so anyone the
// function left out is added back at 0-0.
function toStandings(rows, roster) {
  const byId = new Map(
    (rows || []).map((r) => [
      r.member_id,
      {
        member_id: r.member_id,
        name: r.name,
        wins: Number(r.wins) || 0,
        losses: Number(r.losses) || 0,
        net: Number(r.net) || 0,
      },
    ]),
  )
  return rank(
    roster.map(
      (m) => byId.get(m.id) ?? { member_id: m.id, name: m.name, wins: 0, losses: 0, net: 0 },
    ),
  )
}

/**
 * @param scope 'all' for all-time, a season id to pin to that season, or
 *   undefined to use the active season when there is one and all-time otherwise.
 */
export async function loadBoard(env, slug, { scope } = {}) {
  const group = await loadGroup(env, slug)
  if (!group) return null
  const db = client(env)

  const [members, seasons] = await Promise.all([
    db.select(`/members?group_id=eq.${group.id}&select=id,name`),
    loadSeasons(env, group.id),
  ])
  const roster = [...(members || [])].sort((a, b) => a.name.localeCompare(b.name))
  const nameOf = new Map(roster.map((m) => [m.id, m.name]))

  const activeSeason = activeSeasonOf(seasons)
  const pinned = scope && scope !== 'all' ? seasons.find((s) => s.id === scope) ?? null : null
  const season = scope === 'all' ? null : pinned ?? (scope ? null : activeSeason)
  const seasonFilter = season ? `&season_id=eq.${season.id}` : ''

  const [standingsRows, latest, earliest] = await Promise.all([
    db.rpc('get_standings', { p_group_id: group.id, p_season_id: season?.id ?? null }),
    // limit=1 for the latest result, count=exact for how many there are in scope.
    db.selectWithCount(
      `/results?group_id=eq.${group.id}${seasonFilter}&select=id,note,created_at,result_participants(member_id,side)&order=created_at.desc&limit=1`,
    ),
    db.select(
      `/results?group_id=eq.${group.id}${seasonFilter}&select=created_at&order=created_at.asc&limit=1`,
    ),
  ])

  const standings = toStandings(standingsRows, roster)
  const resultCount = latest.count

  const raw = latest.rows[0]
  const latestResult = raw
    ? {
        note: raw.note || null,
        created_at: raw.created_at,
        winners: (raw.result_participants || [])
          .filter((p) => p.side === 'win')
          .map((p) => nameOf.get(p.member_id))
          .filter(Boolean),
        losers: (raw.result_participants || [])
          .filter((p) => p.side === 'lose')
          .map((p) => nameOf.get(p.member_id))
          .filter(Boolean),
      }
    : null

  return {
    group: { slug: group.slug, name: group.name, created_at: group.created_at },
    standings,
    roster: roster.map((m) => ({ id: m.id, name: m.name })),
    resultCount,
    latestResult,
    leaderMemberId: leaderMemberId(standings, resultCount),
    summary: summarize(standings, resultCount),

    // Which slice of history the numbers above cover.
    scope: season ? season.id : 'all',
    season: season ? { id: season.id, name: season.name, started_at: season.started_at } : null,
    activeSeason: activeSeason
      ? { id: activeSeason.id, name: activeSeason.name, started_at: activeSeason.started_at }
      : null,
    coverage: {
      first_result_at: earliest?.[0]?.created_at ?? null,
      last_result_at: raw?.created_at ?? null,
    },
    pastSeasons: seasons
      .filter((s) => s.ended_at)
      .map((s) => ({
        id: s.id,
        name: s.name,
        started_at: s.started_at,
        ended_at: s.ended_at,
        champion: s.champion_member_id
          ? { id: s.champion_member_id, name: nameOf.get(s.champion_member_id) ?? 'Someone' }
          : null,
        champion_net: s.champion_net,
      })),
  }
}
