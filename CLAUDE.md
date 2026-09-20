# GroupBetScoreboard: infrastructure and database reference

## Live infrastructure
Cloudflare Pages project: groupbetscoreboard, live at
groupbetscoreboard.pages.dev, account upham51@gmail.com. Connected to
this GitHub repo, production branch claude/nice-edison-jpmwrd, build
command npm run build, output directory dist.

Supabase project: ref jonwdrdzsxnvtbeuvexh, region us-west-1, account
medsonicstore@gmail.com, free tier.

Turnstile widget: named groupbetscoreboard, scoped to
groupbetscoreboard.pages.dev, mode Managed.

## Environment variables
Four variables, set as Secret type in the Cloudflare Pages dashboard
under Settings, Runtime, Variables and secrets, for both Production
and Preview environments. Note this is the Runtime store specifically,
not the separate build-time "Environment variables (advanced)" store
shown during initial project creation, that one is effectively unused,
Pages Functions read from Runtime at request time.

SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY,
TURNSTILE_SECRET_KEY. Names only here, values live only in the
Cloudflare dashboard and in Supabase's own settings, never in this
file or in git.

## Database schema, current live state

Four tables: groups, members, results, result_participants.

groups: id uuid pk, slug text unique, name text, created_at timestamptz.

members: id uuid pk, group_id uuid fk to groups, name text, created_at
timestamptz, hidden_at timestamptz nullable, hidden_city text
nullable, hidden_region text nullable.

results: id uuid pk, group_id uuid fk to groups, note text nullable,
created_at timestamptz, stakes text nullable, settled_at timestamptz
nullable (defaults to now(), so a plain instant-logged result needs no
special handling; a pending active bet is inserted with this
explicitly null), hidden_at timestamptz nullable, hidden_city text
nullable, hidden_region text nullable.

result_participants: result_id uuid, member_id uuid, side text
nullable with check (side in ('win','lose') or side is null), null
side means the person is in a pending bet with no outcome decided
yet. Composite primary key on (result_id, member_id).

There is no seasons table. It existed at one point and was removed
entirely, this app is a permanent all-time board by design, do not
reintroduce season-scoping without being asked.

Row Level Security is enabled on all four tables, intentionally wide
open, matching the no-accounts design: select and insert are public
on every table, update is public on members, results, and
result_participants (needed for settling a pending bet and for
soft-delete and restore). There is no delete policy anywhere, nothing
is ever hard-deleted, removal is always the hidden_at pattern.

Two triggers enforce abuse caps, both before insert: check_member_cap
rejects a group's 51st member, check_result_rate rejects a group's
501st result within a rolling 24 hours. Both are exact at the
boundary, including within a single multi-row insert statement.

Six functions exist, callable directly rather than reimplementing
their logic client-side:

get_standings(p_group_id uuid) returns member_id, name, wins, losses,
net, counting only results where settled_at is not null and hidden_at
is null.

get_head_to_head(p_member_a uuid, p_member_b uuid) returns a_wins,
b_wins.

get_best_win(p_member_id uuid) and get_worst_loss(p_member_id uuid)
return result_id, note, stakes, created_at, and an opponent count,
for that member's most lopsided win or loss.

get_closest_rivalry(p_group_id uuid) returns the two people in the
group with the tightest head-to-head record, minimum two meetings,
returns no row if nothing qualifies yet.

get_current_streak(p_member_id uuid) returns streak_side and
streak_length, the unbroken run of same-outcome results counting back
from their most recent settled, non-hidden result.

Full current definitions of all six, exactly as they exist in the
live database right now, for reference if any of them ever need to
change:

```sql
CREATE OR REPLACE FUNCTION public.get_standings(p_group_id uuid)
 RETURNS TABLE(member_id uuid, name text, wins bigint, losses bigint, net bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    m.id as member_id,
    m.name,
    count(*) filter (where rp.side = 'win' and r.settled_at is not null and r.hidden_at is null) as wins,
    count(*) filter (where rp.side = 'lose' and r.settled_at is not null and r.hidden_at is null) as losses,
    count(*) filter (where rp.side = 'win' and r.settled_at is not null and r.hidden_at is null)
      - count(*) filter (where rp.side = 'lose' and r.settled_at is not null and r.hidden_at is null) as net
  from members m
  left join result_participants rp on rp.member_id = m.id
  left join results r on r.id = rp.result_id
  where m.group_id = p_group_id
  group by m.id, m.name;
$function$

CREATE OR REPLACE FUNCTION public.get_head_to_head(p_member_a uuid, p_member_b uuid)
 RETURNS TABLE(a_wins bigint, b_wins bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    count(*) filter (where w.member_id = p_member_a and l.member_id = p_member_b) as a_wins,
    count(*) filter (where w.member_id = p_member_b and l.member_id = p_member_a) as b_wins
  from result_participants w
  join result_participants l on l.result_id = w.result_id and l.side = 'lose'
  join results r on r.id = w.result_id
  where w.side = 'win'
    and r.settled_at is not null
    and r.hidden_at is null;
$function$

CREATE OR REPLACE FUNCTION public.get_best_win(p_member_id uuid)
 RETURNS TABLE(result_id uuid, note text, stakes text, created_at timestamp with time zone, opponents_beaten bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select r.id, r.note, r.stakes, r.created_at, count(l.member_id) as opponents_beaten
  from result_participants w
  join results r on r.id = w.result_id
  join result_participants l on l.result_id = w.result_id and l.side = 'lose'
  where w.side = 'win' and w.member_id = p_member_id
    and r.settled_at is not null and r.hidden_at is null
  group by r.id, r.note, r.stakes, r.created_at
  order by opponents_beaten desc, r.created_at desc
  limit 1;
$function$

CREATE OR REPLACE FUNCTION public.get_worst_loss(p_member_id uuid)
 RETURNS TABLE(result_id uuid, note text, stakes text, created_at timestamp with time zone, opponents_faced bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select r.id, r.note, r.stakes, r.created_at, count(w.member_id) as opponents_faced
  from result_participants l
  join results r on r.id = l.result_id
  join result_participants w on w.result_id = l.result_id and w.side = 'win'
  where l.side = 'lose' and l.member_id = p_member_id
    and r.settled_at is not null and r.hidden_at is null
  group by r.id, r.note, r.stakes, r.created_at
  order by opponents_faced desc, r.created_at desc
  limit 1;
$function$

CREATE OR REPLACE FUNCTION public.get_closest_rivalry(p_group_id uuid)
 RETURNS TABLE(member_a uuid, member_a_name text, member_b uuid, member_b_name text, a_wins bigint, b_wins bigint, total_meetings bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with pairs as (
    select
      least(w.member_id, l.member_id) as member_x,
      greatest(w.member_id, l.member_id) as member_y,
      w.member_id as winner_id
    from result_participants w
    join result_participants l on l.result_id = w.result_id and l.side = 'lose'
    join results r on r.id = w.result_id
    where w.side = 'win'
      and r.settled_at is not null
      and r.hidden_at is null
  ),
  tallied as (
    select
      member_x, member_y,
      count(*) filter (where winner_id = member_x) as x_wins,
      count(*) filter (where winner_id = member_y) as y_wins,
      count(*) as total
    from pairs
    group by member_x, member_y
  )
  select t.member_x, mx.name, t.member_y, my.name, t.x_wins, t.y_wins, t.total
  from tallied t
  join members mx on mx.id = t.member_x
  join members my on my.id = t.member_y
  where t.total >= 2
  order by abs(t.x_wins - t.y_wins) asc, t.total desc
  limit 1;
$function$

CREATE OR REPLACE FUNCTION public.get_current_streak(p_member_id uuid)
 RETURNS TABLE(streak_side text, streak_length integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with ordered as (
    select
      rp.side,
      row_number() over (order by r.created_at desc) as rn
    from result_participants rp
    join results r on r.id = rp.result_id
    where rp.member_id = p_member_id
      and r.settled_at is not null
      and r.hidden_at is null
  ),
  first_row as (
    select side from ordered where rn = 1
  ),
  break_point as (
    select min(rn) as first_break
    from ordered, first_row
    where ordered.side is distinct from first_row.side
  )
  select
    (select side from first_row),
    coalesce((select first_break - 1 from break_point), (select count(*) from ordered))
  where exists (select 1 from first_row);
$function$
```

## Design decisions worth knowing before changing anything

No accounts, no login, no admin, on purpose. Anyone with a group's
link can read and write. This was a deliberate choice over building
an admin role, accountability comes from soft-delete plus a visible
history and restore feed instead of from permissions.

Turnstile fails closed. If TURNSTILE_SECRET_KEY is missing, writes
refuse rather than silently going through. This matches how the app
already behaves when Supabase settings are missing, and it was a
deliberate choice, don't change it to fail open.

Location on a hidden record comes from Cloudflare's request geo data
(context.request.cf.city, context.request.cf.region) inside the Pages
Function that performs the hide, no external service.

The slug's random suffix is six characters from an alphabet that
excludes characters people misread off a screenshot (i, l, 1, o, 0).

## Working with Jayson

Jayson, who owns this project, is non-technical. He does not run
terminal commands, edit config files, execute SQL, or click through
dashboard settings himself. Any task that involves one of those things
needs to happen one of two ways: a Claude Code session does it
directly against this repo, or the task becomes a complete,
ready-to-paste prompt handed to him for Claude Code, or it gets done
by Cowork, the browser-based Claude surface with access to the
Cloudflare and Supabase dashboards. Never respond to a request from
Jayson with instructions telling him to personally run a command, edit
a file, or change a setting, hand off the action instead.
