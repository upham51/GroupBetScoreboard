-- Seasons are gone. This is a permanent all-time board.
--
-- Applied to the hosted project already; kept here for reference and local
-- development parity. The security note at the top of 0001_init.sql still
-- holds: there is no authentication anywhere in this app, and every policy is
-- deliberately open.
--
-- What replaces seasons is a bet that has not finished yet. A result row with
-- settled_at null is an active bet: the people are named, the outcome is not
-- known, and result_participants.side stays null until somebody settles it.
--
-- Deletion is soft everywhere. hidden_at takes the row out of standings and
-- the roster while leaving it readable, and hidden_city/hidden_region record
-- where the request came from, so removing something is accountable without
-- anything requiring permission.

drop table if exists seasons cascade;
alter table results drop column if exists season_id;

alter table results add column stakes text;
-- Defaulting to now() keeps the instant log-a-result flow working unchanged:
-- it inserts without mentioning settled_at and the row lands already settled.
-- Creating an active bet has to pass settled_at null explicitly.
alter table results add column settled_at timestamptz default now();
alter table results add column hidden_at timestamptz;
alter table results add column hidden_city text;
alter table results add column hidden_region text;

alter table members add column hidden_at timestamptz;
alter table members add column hidden_city text;
alter table members add column hidden_region text;

-- Null side means "named on this bet, outcome not decided yet".
alter table result_participants alter column side drop not null;
alter table result_participants drop constraint result_participants_side_check;
alter table result_participants add constraint result_participants_side_check
  check (side = any (array['win','lose']) or side is null);

-- The functions the app calls. Definitions below match what is running on the
-- project; nothing in the app recomputes any of this.
--
-- Worth knowing when reading the app code: get_standings and
-- get_closest_rivalry join members without checking members.hidden_at, so a
-- removed member still comes back from them. The app filters its results
-- against the visible roster, which is why a removed name disappears from the
-- board immediately. Hidden and unsettled results are excluded here correctly.

CREATE OR REPLACE FUNCTION public.get_standings(p_group_id uuid)
 RETURNS TABLE(member_id uuid, name text, wins bigint, losses bigint, net bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_head_to_head(p_member_a uuid, p_member_b uuid)
 RETURNS TABLE(a_wins bigint, b_wins bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_best_win(p_member_id uuid)
 RETURNS TABLE(result_id uuid, note text, stakes text, created_at timestamptz, opponents_beaten bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;

CREATE OR REPLACE FUNCTION public.get_worst_loss(p_member_id uuid)
 RETURNS TABLE(result_id uuid, note text, stakes text, created_at timestamptz, opponents_faced bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;

-- Tightest head-to-head in the group: smallest win gap, at least two meetings,
-- ties broken by the most meetings. Returns no row until some pair has met
-- twice, which is the correct answer for a young board rather than an error.
CREATE OR REPLACE FUNCTION public.get_closest_rivalry(p_group_id uuid)
 RETURNS TABLE(member_a uuid, member_a_name text, member_b uuid, member_b_name text, a_wins bigint, b_wins bigint, total_meetings bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;

-- The unbroken run of same-outcome results counting back from the member's
-- most recent settled, non-hidden result.
CREATE OR REPLACE FUNCTION public.get_current_streak(p_member_id uuid)
 RETURNS TABLE(streak_side text, streak_length integer)
 LANGUAGE sql STABLE SET search_path TO 'public'
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
$function$;
