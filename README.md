# Group bet scoreboard

A shared scoreboard for the bets a friend group already runs in its chat. No
accounts, no login, no money. Anyone with a group's link can see the board,
open a bet, settle one, and log a result that is already decided.

## What it is

- `/` a headline and one button.
- `/new` a group name and a roster pasted one name per line or comma separated.
- `/g/<slug>` the board, as four tabs under one header:
  - **Board**: open bets as a swipeable rail on top, then standings sorted by
    net record, the latest result and the closest rivalry along the bottom edge
    of the panel, and a tap-in detail on each row with best win, worst loss and
    head-to-head. Two floating buttons: open a bet, or log a result that is
    already decided. Settled bets are a disclosure below.
  - **Stats**: the settled count, how many settled bets named stakes, win rate
    per person, the most lopsided result on the board, the longest hot and cold
    runs, and the pairs who keep meeting.
  - **History**: everything that has been removed, with a restore on each.
  - **Share**: the card that goes out with the link, and a copy button.
- `/g/<slug>/board` the same share card on its own page, chrome-free, for a
  clean manual screenshot, with a line saying which stretch of time it covers.
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

The Stats tab takes most of what it shows from the board payload it already
has: the settled count, the win rates and the two runs are all arithmetic on
`standings` and `streaks`. Three things are not in there, so
`/api/groups/<slug>/stats` reads the results themselves for them: the most
lopsided settled result, how many settled results named stakes, and a grudge
tally across the pairs who have met more than once.

That tally is the same shape as `get_closest_rivalry`, which returns only the
single tightest pair. Rather than add a seventh function for the top few, the
endpoint counts the pairs in JavaScript from rows it has already fetched. It
looks at the most recent 500 settled results and says so in the card when there
are older ones behind them.

The "owed" number counts settled results that named stakes. The app never sees
whether a round was actually bought, so the label says what the number is
rather than implying a debt was tracked.

## Motion

There is one interaction timing, 160ms on `cubic-bezier(.2,.7,.4,1)`, used for
every hover, press and focus change. Everything below is deliberately outside
it, and everything below collapses under `prefers-reduced-motion`.

**Events.** These play once and mark something that actually happened:

1. Rows slide to their new position when a result changes the order, 450ms on a
   weighted curve (Framer Motion layout animation).
2. The gold rule redraws itself left to right, 700ms, but only when somebody new
   reaches the top. Extending an existing lead does not trigger it, and neither
   does loading the page.
3. A sheet's confirmation draws a circle and then a check and throws confetti
   outward behind them, about 900ms, holds, and dismisses itself.
4. Content rises into place on arrival, 450 to 700ms, staggered by a few frames
   down a list.

**Standing states.** These loop, slowly, because they are describing a
condition rather than an occurrence: the gradient blobs behind the app, the
conic mesh in the header, the mascot's float, the pulse ring on the log button,
the live dot on an open bet, and the streak badges. The flame breathes and
flickers, the frost mark drifts and shimmers. Colour is never the only signal:
each badge carries a shape and its number.

The new standings are fetched while the confirmation is on screen but not
applied until the sheet closes, so the reorder happens in view rather than
behind the dim.

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

Orange is the only action colour. Every button, link and active tab is orange
or the orange-to-deep-orange wash; violet is the second half of a gradient and
the fill on the losing side of a picker, never a button of its own. Paper is
warm (`#FFFBF6`) and the ink is plum (`#2E2140`), so nothing in the app is pure
white or pure black.

Gold is still used in exactly two places: the rule fading along the top edge of
the standings panel, and the first-place row. The first-place row only takes it
when there is a single clear leader with a winning record, so a fresh or
all-even board stays plain. The rank chip and a "first" flag carry the same
information, so the colour is never the only signal.

The app is laid out as a single phone-width column. On a wide screen that
column centres itself on a lit, grainy backdrop rather than stretching; the
bottom nav and the floating buttons follow the column, not the window.

Avatars have no uploads behind them. A person's colour is a gradient picked by
hashing their member id, so the same person is the same colour in the
standings, the pickers and the share card, on every device.

Icons are hand-drawn inline SVG on a 14px grid with a 1.7 stroke that inherits
`currentColor`. There is no icon library and no emoji anywhere in the UI.

The one photograph in the app is the backdrop of the blowout card on the Stats
tab, hotlinked from Unsplash and loaded lazily. It sits on a plum-to-violet
gradient and the card reads correctly without it, so a blocked or slow request
costs nothing but the texture.

## What this version does not do

No accounts. No dispute or settlement flow: whoever logs a result is trusted,
which is the intended design for a friend group. No real money anywhere. No chat
bot; distribution is the link and its preview image.
