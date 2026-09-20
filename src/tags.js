// The line under a name on the board.
//
// Every one of these is a statement about numbers that are actually on the
// screen: the record, the net, the streak. Nothing is invented, and nobody gets
// a nickname the board cannot back up. Trash talk that is wrong stops being
// funny on the second read.

export function tagFor(row, streak) {
  const played = row.wins + row.losses
  if (played === 0) return 'yet to be tested'
  if (streak?.side === 'win' && streak.length >= 3) return `${streak.length} in a row and insufferable`
  if (streak?.side === 'lose' && streak.length >= 3) return 'currently in witness protection'
  if (row.rank === 1 && row.net > 0) return 'running the board'
  if (row.net === 0) return 'painfully average'
  if (row.net > 0) return `${row.net} to the good`
  if (row.losses >= row.wins * 2) return 'talks the most, wins the least'
  return 'one good night away'
}
