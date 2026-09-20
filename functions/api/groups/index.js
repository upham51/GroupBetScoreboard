// POST /api/groups -> create a group, its roster, and return the board slug.

import { client, SupabaseError } from '../../_lib/supabase.js'
import { json, fail, methodNotAllowed } from '../../_lib/http.js'
import { buildSlug, cleanGroupName, parseRoster, MAX_ROSTER } from '../../_lib/text.js'

export const onRequestGet = () => methodNotAllowed('POST')

export async function onRequestPost({ request, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return fail(400, 'That request body was not readable as JSON.')
  }

  const name = cleanGroupName(payload?.name)
  const roster = parseRoster(payload?.roster)

  if (!name) return fail(400, 'Give the group a name.')
  if (roster.length < 2) return fail(400, 'Add at least two names to the roster.')

  const db = client(env)

  // The slug carries a random suffix, so a collision means two boards were
  // created in the same instant with the same name. Retry rather than fail.
  let group = null
  let lastError = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const rows = await db.insert('groups', { slug: buildSlug(name), name })
      group = rows?.[0]
      break
    } catch (err) {
      lastError = err
      const isDuplicateSlug = err instanceof SupabaseError && err.status === 409
      if (!isDuplicateSlug) throw err
    }
  }
  if (!group) throw lastError ?? new Error('Could not create the group.')

  try {
    await db.insert(
      'members',
      roster.slice(0, MAX_ROSTER).map((memberName) => ({ group_id: group.id, name: memberName })),
      { returning: false },
    )
  } catch (err) {
    // A group with no roster is useless, so do not leave one behind.
    await db.remove(`/groups?id=eq.${group.id}`).catch(() => {})
    throw err
  }

  return json({ slug: group.slug, name: group.name, memberCount: roster.length }, { status: 201 })
}
