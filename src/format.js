// Formatting shared by the client views.
//
// formatNet is deliberately duplicated from functions/_lib/board.js: importing
// that module here would pull the Supabase client into the browser bundle.

export function formatNet(net) {
  return net > 0 ? `+${net}` : String(net)
}

// "Dana", "Dana and Sam", "Dana, Sam and Alex".
export function joinNames(list) {
  if (!list || list.length === 0) return ''
  if (list.length === 1) return list[0]
  if (list.length === 2) return `${list[0]} and ${list[1]}`
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days <= 10) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
