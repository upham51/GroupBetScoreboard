// Soft delete.
//
// Nothing is ever removed. hidden_at takes a row out of the standings, the
// roster and the feeds, and the city and region the request came from are
// recorded alongside it. There are no accounts here, so this is what makes a
// deletion accountable: the History view can say what went, when, and roughly
// from where, and anybody can put it back.

// Cloudflare fills request.cf on the edge. It is absent in some local and
// preview contexts, so every field is treated as optional.
export function geoOf(request) {
  const cf = request?.cf
  const clean = (value) =>
    typeof value === 'string' && value.trim() && value !== 'unknown' ? value.trim() : null
  return {
    hidden_city: clean(cf?.city),
    hidden_region: clean(cf?.region),
  }
}

export function hidePatch(request) {
  return { hidden_at: new Date().toISOString(), ...geoOf(request) }
}

export const RESTORE_PATCH = { hidden_at: null, hidden_city: null, hidden_region: null }

// "removed 3 minutes ago from Reno, Nevada", or just the time when the edge
// gave us nothing to go on.
export function placeOf(city, region) {
  return [city, region].filter(Boolean).join(', ') || null
}
