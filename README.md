# Group bet scoreboard

A shared scoreboard for the bets a friend group already runs in its chat. No
accounts, no login, no money. Anyone with a group's link can see the board,
open a bet, settle one, and log a result that is already decided.

## What it is

- `/` one line and one button.
- `/new` a group name and a roster pasted one name per line or comma separated.
- `/g/<slug>` the board: open bets on top, then standings sorted by net record,
  the closest rivalry, and a tap-in detail view on each row with head-to-head,
  best win and worst loss. Two floating buttons: open a bet, or log a result
  that is already decided. Past bets and History are text links below.
- `/g/<slug>/board` the same standings with no buttons, for a clean manual
  screenshot, with a line saying which stretch of time they cover.
- `/og/<slug>` the current standings rendered as a 1200x630 PNG, referenced from
  the board's `og:image` so pasting a group's link into a chat shows the live
  board as the preview card.

Both the board and the screenshot view end with a plain "start your own board"
link. That link, and the preview image on the one people paste into a chat, are
the whole distribution model.

## Bets, open and settled

This is a permanent all-time board. There are no seasons.

A result and an open bet are the same row. `results.settled_at` decides which
one it is:

- **Settled** (`settled_at` set): a result. Winners and losers are recorded and
  it counts toward the standings. The quick log-a-result flow produces these
  directly, and it works exactly as it always has: `settled_at` defaults to
  `now()`, so that insert never mentions it.
- **Open** (`settled_at` null): a bet whose outcome nobody knows yet. The people
  are named, every `result_participants.side` is null, and it counts toward
  nothing. Anybody can settle it, which assigns the sides and stamps
  `settled_at`.

Settling can only decide the people already named on the bet, and it has to
decide all of them. A settled result with somebody left undecided would sit in
the standings counting for nothing and read as a bug, so the endpoint refuses
it.

`stakes` is its own column and its own line in the UI, next to the note rather
than folded into it. It is what makes a row read as a wager rather than a
scored event.

## Nothing is deleted

There is still no login, no admin and no accounts. Anybody can remove a result,
an open bet or a person from the board, and removal is soft: `hidden_at` is set,
`hidden_city` and `hidden_region` are taken from Cloudflare's geo data on the
request, and the row stays.

A hidden row drops out of the standings, the roster picker and the feeds
immediately. It appears in the History view as one line saying what went, when,
and roughly from where, each with a restore that clears `hidden_at`.

That is the trade this app already makes everywhere else: nothing requires
permission, and what keeps it workable is that nothing is destroyed and every
removal is visible with a way back. It is also the fix for a bad entry landing
in a real board with no clean way to take it off.

Removing something is not behind Turnstile. It is reversible and logged, and a
challenge on a restore would be friction with nothing behind it. Opening a bet
and settling one are, along with creating a group and logging a result.

## Statistics

Every statistic comes from a Postgres function: `get_standings`,
`get_head_to_head`, `get_best_win`, `get_worst_loss`, `get_closest_rivalry` and
`get_current_streak`. The app calls them and recomputes none of it. All six
count only settled, non-hidden results.

One characteristic is worth knowing: `get_standings` and `get_closest_rivalry`
join `members` without checking `members.hidden_at`, so a removed person still
comes back from them. `loadBoard` filters both against the visible roster,
which is what makes a removed name disappear from the board at once, and what
stops a rivalry naming somebody who is no longer on it. The same note is in
`0004_bets_and_soft_delete.sql`.

`get_closest_rivalry` returns no row until some pair has met twice. That is the
correct answer for a young board, not an error, and the board renders nothing
rather than an empty box.

`get_current_streak` is asked for per member, but only for members with at
least three settled results, since a streak of three cannot exist below that.
That keeps a large roster from turning into a call per name for nothing.

## Motion

Four animations are deliberately outside the 150ms interaction timing used for
hover and press. The first three mark an event rather than routine feedback:

1. Rows slide to their new position when a result changes the order, 450ms on a
   weighted curve (Framer Motion layout animation).
2. The gold rule redraws itself left to right, 700ms, but only when somebody new
   reaches the top. Extending an existing lead does not trigger it, and neither
   does loading the page.
3. The log-result confirmation draws a circle and then a check, about 560ms,
   holds, and dismisses itself.

The fourth is different: a streak badge is a standing state, not an event, so
it loops. The flame breathes and flickers, the frost mark drifts and shimmers,
both slowly and both restrained. Colour is never the only signal: each badge
carries a shape and its number.

The new standings are fetched while the confirmation is on screen but not
applied until the modal closes, so the reorder happens in view rather than
behind the dim. Under `prefers-reduced-motion` all four collapse, the looping
ones to a single held frame.

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

Four environment variables, set in the Cloudflare Pages project settings
(Settings, then Environment variables) for both Production and Preview:

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_ANON_KEY` | the project's anon key |
| `TURNSTILE_SITE_KEY` | the Turnstile widget's site key (public) |
| `TURNSTILE_SECRET_KEY` | the Turnstile secret key (server only) |

None of them are committed. For local development, copy `.dev.vars.example` to
`.dev.vars`, which is gitignored.

**Set all four before deploying this.** Every guarded write refuses when
`TURNSTILE_SECRET_KEY` is absent, and says so, rather than waving writes
through. Reading a board, the screenshot view and the
preview image are unaffected either way.

## Abuse guardrails

There are no accounts, so the write endpoints are open to anybody with the
link. Three things sit in front of them.

**Turnstile** on the four write actions: creating a group, logging a result,
opening a bet and settling one.
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

Opening a bet and settling one go through it too. Removing and restoring do
not: both are reversible and every removal is on the History list, so a
challenge there would be friction with nothing behind it.

## Database

The schema is applied to the Supabase project. `supabase/migrations/` is kept
for reference and local parity, and replaying them in order reproduces what is
running: `0001_init.sql` for the base tables, `0002_seasons_and_stats.sql` for
seasons (since removed) and the first four functions, `0003_abuse_caps.sql` for
the cap triggers, and `0004_bets_and_soft_delete.sql`, which drops seasons and
adds open bets, stakes, soft delete and the six functions as they stand.

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
