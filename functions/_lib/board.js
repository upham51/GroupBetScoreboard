// Loads and shapes a group's board. Shared by the JSON API, the OG image
// function, and the HTML shell that injects share meta tags, so all three agree
// on the order, the ranking, and the sentence under the panel.

import { client } from './supabase.js'

export function formatNet(net) {
  return net > 0 ? `+${net}` : String(net)
}

function rank(rows) {
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

export async function loadBoard(env, slug) {
  const group = await loadGroup(env, slug)
  if (!group) return null
  const db = client(env)

  const [standingsRows, latest] = await Promise.all([
    db.select(`/standings?group_id=eq.${group.id}&select=member_id,name,wins,losses,net`),
    // limit=1 for the latest result, count=exact for how many there are in total.
    db.selectWithCount(
      `/results?group_id=eq.${group.id}&select=id,note,created_at,result_participants(member_id,side)&order=created_at.desc&limit=1`,
    ),
  ])

  const standings = rank(
    (standingsRows || []).map((r) => ({
      member_id: r.member_id,
      name: r.name,
      wins: Number(r.wins) || 0,
      losses: Number(r.losses) || 0,
      net: Number(r.net) || 0,
    })),
  )

  const nameOf = new Map(standings.map((r) => [r.member_id, r.name]))
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
    roster: [...standings]
      .map((r) => ({ id: r.member_id, name: r.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    resultCount: latest.count,
    latestResult,
    leaderMemberId: leaderMemberId(standings, latest.count),
    summary: summarize(standings, latest.count),
  }
}
