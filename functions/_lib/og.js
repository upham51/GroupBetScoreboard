// Renders a group's current standings as a 1200x630 PNG.
//
// Satori turns the element tree below into SVG, then resvg (compiled to WASM)
// rasterises it to PNG. Same technique as Vercel's OG image library, built for
// the Workers runtime. Satori supports only a flexbox subset of CSS, which is
// why every box here is explicit about its size and direction.
//
// The element tree is written as plain satori VNodes rather than JSX so this
// file needs no JSX transform configuration from the Pages Functions bundler.

import { CustomFont, loadGoogleFont, render } from '@cf-wasm/og'
import { theme } from './theme.js'
import { formatNet } from './board.js'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
const MAX_ROWS = 7

// Font files are fetched from Google Fonts once per isolate and then reused.
const fontFiles = new Map()

function fontFile(family, weight) {
  const key = `${family}:${weight}`
  if (!fontFiles.has(key)) {
    fontFiles.set(
      key,
      loadGoogleFont(family, { weight, subset: 'latin' }).catch((err) => {
        fontFiles.delete(key)
        throw err
      }),
    )
  }
  return fontFiles.get(key)
}

// If Google Fonts cannot be reached the image still renders: @cf-wasm/og always
// registers a bundled fallback under the family name "sans serif", and every
// style below names it as the last family in its list.
async function fonts() {
  const wanted = [
    { family: 'Plus Jakarta Sans', weight: 400 },
    { family: 'Outfit', weight: 600 },
    { family: 'Averia Serif Libre', weight: 700 },
  ]
  const settled = await Promise.allSettled(wanted.map((f) => fontFile(f.family, f.weight)))
  const loaded = []
  settled.forEach((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      loaded.push(new CustomFont(wanted[i].family, outcome.value, { weight: wanted[i].weight, style: 'normal' }))
    } else {
      console.warn(`og: could not load ${wanted[i].family}, falling back`, outcome.reason?.message)
    }
  })
  return loaded
}

const SANS = 'Plus Jakarta Sans, sans serif'
const TIGHT = 'Outfit, sans serif'
const SERIF = 'Averia Serif Libre, sans serif'

const box = (style, children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } })
const line = (content, style) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: content } })

function standingsRow(row, { isLeader, isLast }) {
  return box(
    {
      alignItems: 'center',
      height: 52,
      paddingLeft: isLeader ? 21 : 24,
      paddingRight: 24,
      backgroundColor: isLeader ? theme.goldTint : theme.panel,
      borderLeft: isLeader ? `3px solid ${theme.gold}` : 'none',
      borderBottom: isLast ? 'none' : `1px solid ${theme.border}`,
    },
    [
      line(String(row.rank), {
        width: 40,
        fontFamily: TIGHT,
        fontSize: 22,
        color: theme.faint,
      }),
      line(row.name, {
        flexGrow: 1,
        fontFamily: TIGHT,
        fontSize: 30,
        color: theme.ink,
        overflow: 'hidden',
      }),
      line(`${row.wins}-${row.losses}`, {
        width: 130,
        justifyContent: 'flex-end',
        fontFamily: SANS,
        fontSize: 22,
        color: theme.muted,
      }),
      line(formatNet(row.net), {
        width: 92,
        justifyContent: 'flex-end',
        fontFamily: TIGHT,
        fontSize: 30,
        color: isLeader ? theme.goldInk : row.net < 0 ? theme.faint : theme.ink,
      }),
    ],
  )
}

function panel(board, shown) {
  // The reserved gold rule, fading along the top edge.
  const rule = box({ height: 4, backgroundImage: `linear-gradient(90deg, ${theme.gold}, #FFD97A 35%, rgba(201,162,39,0))` }, [])
  const rows = shown.map((row, i) =>
    standingsRow(row, {
      isLeader: row.member_id === board.leaderMemberId,
      isLast: i === shown.length - 1,
    }),
  )
  return box(
    {
      flexDirection: 'column',
      backgroundColor: theme.panel,
      borderRadius: 24,
      overflow: 'hidden',
    },
    [rule, ...rows],
  )
}

function card(board) {
  const shown = board.standings.slice(0, MAX_ROWS)
  const hidden = board.standings.length - shown.length

  return box(
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      flexDirection: 'column',
      backgroundColor: theme.orange,
      backgroundImage: theme.wash,
      padding: 48,
      fontFamily: SANS,
    },
    [
      line('Group scoreboard', {
        fontFamily: SANS,
        fontSize: 18,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.onWashMuted,
      }),
      line(board.group.name, {
        marginTop: 8,
        fontFamily: SERIF,
        fontSize: 54,
        color: theme.onWash,
        overflow: 'hidden',
      }),

      // The panel is centred in whatever room is left, so a four-name board and
      // a full one both sit properly in the frame.
      box(
        {
          flexGrow: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 18,
          paddingBottom: 18,
        },
        [panel(board, shown)],
      ),

      box({ alignItems: 'flex-end', justifyContent: 'space-between' }, [
        line(board.summary.headline, { fontFamily: SANS, fontSize: 24, color: theme.onWash }),
        line(hidden > 0 ? `and ${hidden} more on the board` : `${board.standings.length} on the board`, {
          fontFamily: SANS,
          fontSize: 20,
          color: theme.onWashMuted,
        }),
      ]),
    ],
  )
}

export async function renderBoardPng(board) {
  const result = await render(card(board), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: await fonts(),
  }).asPng()
  return result.image
}
