// Slug + roster text handling. Shared by the create-group function and the
// client, so keep it dependency-free.

export const MAX_GROUP_NAME = 60
export const MAX_MEMBER_NAME = 32
export const MAX_ROSTER = 40
export const MAX_NOTE = 120
export const MAX_SEASON_NAME = 40

const SLUG_SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

// Combining marks left over after NFKD, built from char codes to keep this file
// pure ASCII.
const COMBINING_MARKS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

export function slugify(name) {
  const base = String(name)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return base || 'board'
}

// Six characters out of a 31 character alphabet is a bit under 900 million
// slugs per name, which is what makes scanning for other groups' boards
// pointless. The alphabet leaves out the characters people mix up when reading
// a link off a screenshot (i/l/1, o/0), because these get retyped by hand.
export function slugSuffix(length = 6) {
  const alphabet = SLUG_SUFFIX_ALPHABET
  // Reject the tail of the byte range that would not divide evenly, so every
  // character is equally likely rather than the first few being slightly
  // favoured.
  const limit = 256 - (256 % alphabet.length)
  let out = ''
  while (out.length < length) {
    const bytes = new Uint8Array(length)
    crypto.getRandomValues(bytes)
    for (const b of bytes) {
      if (b >= limit) continue
      out += alphabet[b % alphabet.length]
      if (out.length === length) break
    }
  }
  return out
}

export function buildSlug(name) {
  return `${slugify(name)}-${slugSuffix()}`
}

// People paste rosters as one name per line, as a comma separated list, or as a
// mix of both. Accept all three.
export function parseRoster(input) {
  const seen = new Set()
  const names = []
  for (const raw of String(input || '').split(/[\n,;]+/)) {
    const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_MEMBER_NAME)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
    if (names.length >= MAX_ROSTER) break
  }
  return names
}

export function cleanGroupName(input) {
  return String(input || '').replace(/\s+/g, ' ').trim().slice(0, MAX_GROUP_NAME)
}

export function cleanNote(input) {
  const note = String(input || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE)
  return note || null
}

export function cleanSeasonName(input) {
  return String(input || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SEASON_NAME)
}

// What the "start a season" control offers before anybody types: the month the
// season is starting in.
export function defaultSeasonName(now = new Date()) {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
