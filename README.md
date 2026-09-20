# Group bet scoreboard

A shared scoreboard for the bets a friend group already runs in its chat. No
accounts, no login, no settlement, no money. Anyone with a group's link can see
the board and log a result.

## What it is

- `/` one line and one button.
- `/new` a group name and a roster pasted one name per line or comma separated.
- `/g/<slug>` the board: standings sorted by net record, and a floating button
  that opens the log-result modal.
- `/g/<slug>/board` the same standings with no buttons, for a clean manual
  screenshot.
- `/og/<slug>` the current standings rendered as a 1200x630 PNG, referenced from
  the board's `og:image` so pasting a group's link into a chat shows the live
  board as the preview card.

## Stack

React and Vite for the client, Cloudflare Pages Functions for everything
server-side, Supabase (PostgREST) for storage.

The browser never talks to Supabase. Every read and write goes through
`/functions`, so `SUPABASE_ANON_KEY` stays out of the client bundle.

The OG image is Satori (JSX-to-SVG layout) plus a WASM resvg rasteriser, by way
of [`@cf-wasm/og`](https://www.npmjs.com/package/@cf-wasm/og), which packages
both with a `workerd` export condition. Same technique as Vercel's OG image
library, built for the Workers runtime. The element tree in
`functions/_lib/og.js` is written as plain Satori VNodes rather than JSX so the
Pages Functions bundler needs no JSX configuration. Images regenerate on every
request; the data is a handful of rows and a stale scoreboard in a link preview
is worse than the render cost.

## Configuration

Two environment variables, set in the Cloudflare Pages project settings
(Settings, then Environment variables) for both Production and Preview:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | the project's anon key |

Neither is committed. For local development, copy `.dev.vars.example` to
`.dev.vars`, which is gitignored.

## Database

The schema is already applied to the Supabase project.
`supabase/migrations/0001_init.sql` is kept for reference and local parity.

Row level security is on, and every policy is wide open: anyone with the anon
key can read and insert. That is deliberate, because no authentication exists
anywhere in this app. A board is protected only by its slug being unguessable
and shared privately. The same note is at the top of the migration, so nobody
later mistakes it for an oversight.

## Running it

```sh
npm install
npm run dev          # Vite only, no Pages Functions
npm run pages:dev    # build, then wrangler pages dev: the whole thing
```

`npm run dev` serves the client alone, so `/api/*`, `/og/*` and the injected
share tags are not available. Use `npm run pages:dev` to exercise the real
thing.

## Deploying

Cloudflare Pages, connected to this repository:

- Build command: `npm run build`
- Build output directory: `dist`
- Functions come from `/functions` automatically.

`wrangler.toml` carries the compatibility date and the output directory. Set the
two environment variables in the dashboard before the first deploy, or the
board will load with a message saying the deployment has no database settings.

## Design

The palette, type and motion rules live in `src/styles.css` as custom
properties. `functions/_lib/theme.js` holds the same colours for the OG image,
which cannot read the stylesheet. Change one and change the other.

Gold is used in exactly two places: the 3px rule fading along the top edge of
the standings panel, and the first-place row. The first-place row only takes it
when there is a single clear leader with a winning record, so a fresh or
all-even board stays plain. The rank column and a "first" flag carry the same
information, so the colour is never the only signal.

## What this version does not do

No accounts. No dispute or settlement flow: whoever logs a result is trusted,
which is the intended design for a friend group. No real money anywhere. No chat
bot; distribution is the link and its preview image.
