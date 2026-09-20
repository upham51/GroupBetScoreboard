// A person's colour. There are no uploads and no accounts here, so an avatar
// has to come from the one stable thing a member has: their id. The same person
// gets the same gradient on every device and in every view, which is what makes
// the small circle in the share card readable as the same person as the big one
// in the standings.

const PALETTE = [
  'radial-gradient(circle at 32% 28%, #FFE1A8, #FF8A3D 62%, #F0562A)',
  'radial-gradient(circle at 32% 28%, #E3D2FF, #9B7BF0 62%, #6F4FD1)',
  'radial-gradient(circle at 32% 28%, #CFF3E6, #59C6A4 62%, #2E9E80)',
  'radial-gradient(circle at 32% 28%, #FFD5DE, #F2708F 62%, #D14C6D)',
  'radial-gradient(circle at 32% 28%, #D5E6FF, #6D9BE0 62%, #4272BE)',
  'radial-gradient(circle at 32% 28%, #FFE9B8, #E8B54A 62%, #C9A227)',
  'radial-gradient(circle at 32% 28%, #D9F0FF, #5FB8DE 62%, #2E86AE)',
  'radial-gradient(circle at 32% 28%, #F3DDFF, #C07BE6 62%, #9448C4)',
]

export function avatarFor(id) {
  const key = String(id ?? '')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
