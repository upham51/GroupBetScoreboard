// Shared handling of the people named on a result.

export function idList(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  for (const raw of input) {
    if (typeof raw === 'string' && raw) seen.add(raw)
  }
  return [...seen]
}

// Only members still on the board can be named on anything new.
export async function rosterOf(db, groupId) {
  const rows = await db.select(`/members?group_id=eq.${groupId}&hidden_at=is.null&select=id`)
  return new Set((rows || []).map((m) => m.id))
}
