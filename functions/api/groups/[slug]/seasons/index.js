// POST /api/groups/:slug/seasons -> start a season for this group.
//
// Every result logged from now on carries this season's id, until somebody ends
// it. A group has at most one season running at a time.

import { client } from '../../../../_lib/supabase.js'
import { loadGroup, loadSeasons, activeSeasonOf } from '../../../../_lib/board.js'
import { json, fail, methodNotAllowed } from '../../../../_lib/http.js'
import { cleanSeasonName, defaultSeasonName } from '../../../../_lib/text.js'

export const onRequestGet = () => methodNotAllowed('POST')

export async function onRequestPost({ request, params, env }) {
  let payload
  try {
    payload = await request.json()
  } catch {
    return fail(400, 'That request body was not readable as JSON.')
  }

  const group = await loadGroup(env, params.slug)
  if (!group) return fail(404, 'No board with that link.')

  const seasons = await loadSeasons(env, group.id)
  const running = activeSeasonOf(seasons)
  if (running) {
    return fail(409, `${running.name} is already running. End it before starting another.`)
  }

  const name = cleanSeasonName(payload?.name) || defaultSeasonName()
  const db = client(env)
  const rows = await db.insert('seasons', { group_id: group.id, name })
  const season = rows?.[0]
  if (!season) return fail(502, 'The season did not start. Nothing was changed, so try again.')

  return json(
    { id: season.id, name: season.name, started_at: season.started_at },
    { status: 201 },
  )
}
