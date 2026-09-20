# Group bet scoreboard

A shared scoreboard for the bets a friend group already runs in its chat. No
accounts, no login, no settlement, no money. Anyone with a group's link can see
the board and log a result.

## What it is

- `/` one line and one button.
- `/new` a group name and a roster pasted one name per line or comma separated.
- `/g/<slug>` the board: standings sorted by net record, a floating button that
  opens the log-result modal, a season control, and a tap-in detail view on each
  row with head-to-head, best win and worst loss.
- `/g/<slug>/board` the same standings with no buttons, for a clean manual
  screenshot, with a line saying which stretch of time they cover.
- `/og/<slug>` the current standings rendered as a 1200x630 PNG, referenced from
  the board's `og:image` so pasting a group's link into a chat shows the live
  board as the preview card.

Both the board and the screenshot view end with a plain "start your own board"
link. That link, and the preview image on the one people paste into a chat, are
the whole distribution model.

## Seasons

A group can run one season at a time. Starting one stamps every result logged
from then on with its id; ending one freezes a champion onto the season row and
drops the board back to all-time. Closed seasons stay readable under "past
seasons", which is the payoff for ending one.

The board shows the running season when there is one and all-time otherwise,
and `?scope=all` or `?scope=<season id>` pins it to either. The share tags and
the preview image follow the same scope, so a link to a season previews that
season.

## Statistics

Standings, head-to-head, best win and worst loss all come from Postgres
functions (`get_standings`, `get_head_to_head`, `get_best_win`,
`get_worst_loss`). The app calls them and does not recompute any of it.

One characteristic of `get_standings` is worth knowing: scoped to a season it
returns only members who have a result in that season, because a member with no
results has no row for the season filter to keep. Left alone, somebody who had
not played yet would vanish from the board mid-season. `loadBoard` reconciles
what comes back against the roster and shows anyone missing at 0-0, so the list
is always the whole group. The same note is in `0002_seasons_and_stats.sql`.

## Motion

Three animations are deliberately outside the 150ms interaction timing used for
hover and press, because each marks an event rather than routine feedback:

1. Rows slide to their new position when a result changes the order, 450ms on a
   weighted curve (Framer Motion layout animation).
2. The gold rule redraws itself left to right, 700ms, but only when somebody new
   reaches the top. Extending an existing lead does not trigger it, and neither
   does loading the page.
3. The log-result confirmation draws a circle and then a check, about 560ms,
   holds, and dismisses itself.

The new standings are fetched while the confirmation is on screen but not
applied until the modal closes, so the reorder happens in view rather than
behind the dim. Under `prefers-reduced-motion` all three collapse.

## Stack

React and Vite for the client, Framer Motion (`motion`) for the layout
animations, Cloudflare Pages Functions for everything server-side, Supabase
(PostgREST) for storage.

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
| `TURNSTILE_SITE_KEY` | the Turnstile widget's site key (public) |
| `TURNSTILE_SECRET_KEY` | the Turnstile secret key (server only) |

None of them are committed. For local development, copy `.dev.vars.example` to
`.dev.vars`, which is gitignored.

**Set all four before deploying this.** Creating a group and logging a result
both refuse to write when `TURNSTILE_SECRET_KEY` is absent, and say so, rather
than waving writes through. Reading a board, the screenshot view and the
preview image are unaffected either way.

## Abuse guardrails

There are no accounts, so the write endpoints are open to anybody with the
link. Three things sit in front of them.

**Turnstile** on the two write actions, creating a group and logging a result.
The browser solves a challenge, and the corresponding Pages Function verifies
that token with Cloudflare before anything is inserted. Verification happens
after the cheap input checks, so a half-filled form does not spend a token, and
before any database call, so an unverified request never reaches Supabase. A
token is good once: any failed attempt resets the widget and the next try needs
a fresh one.

The site key is public but still comes from the environment, handed to the
browser by `/api/config`, so no key is baked into a build. If the widget cannot
load at all, the form says so and stays unsubmittable rather than failing
silently.

**Slugs** carry a six character random suffix from a 31 character alphabet,
just under 900 million per group name, which is what makes scanning for other
groups' boards pointless. The alphabet leaves out the characters people confuse
when reading a link off a screenshot.

**Database caps**, as triggers, in `0003_abuse_caps.sql`: 50 names per board and
500 results per board per day. They are backstops rather than product limits,
and they hold no matter who is inserting, including anything writing with the
anon key directly instead of going through the functions. The app's own roster
limit is 40, under the 50. When one fires, `/api/*` turns it into a readable
message instead of a generic failure.

Starting and ending seasons are deliberately not behind Turnstile. They are
writes, but they need an existing board's slug, one season runs at a time, and
the scope given was the two forms.

## Database

The schema is applied to the Supabase project. `supabase/migrations/` is kept
for reference and local parity: `0001_init.sql` for the base tables,
`0002_seasons_and_stats.sql` for seasons and the four functions, and
`0003_abuse_caps.sql` for the two cap triggers.

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

Dark mode follows the system setting and is only a second list of the same
tokens; nothing else in the stylesheet knows about it. There is no toggle in
this version, but the `data-theme` hooks are in place for one. The OG image
stays light on purpose: a share card has no viewer to ask.

Gold is used in exactly two places: the 3px rule fading along the top edge of
the standings panel, and the first-place row. The first-place row only takes it
when there is a single clear leader with a winning record, so a fresh or
all-even board stays plain. The rank column and a "first" flag carry the same
information, so the colour is never the only signal.

## What this version does not do

No accounts. No dispute or settlement flow: whoever logs a result is trusted,
which is the intended design for a friend group. No real money anywhere. No chat
bot; distribution is the link and its preview image.
