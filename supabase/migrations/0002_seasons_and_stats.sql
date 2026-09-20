-- Seasons, plus the functions the app calls for every statistic it shows.
--
-- Already applied to the hosted project. Kept here for reference and for local
-- development parity (supabase db reset).
--
-- The security note at the top of 0001_init.sql applies to everything below:
-- there is no authentication anywhere in this app, so the seasons policies are
-- deliberately wide open, update included. Anyone holding a group's link can
-- start or end its seasons. That is the same trust model as logging a result.

create table seasons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  champion_member_id uuid references members(id),
  champion_net integer
);

alter table results add column season_id uuid references seasons(id);

create index idx_seasons_group on seasons(group_id);
create index idx_results_season on results(season_id);

alter table seasons enable row level security;

-- Intentionally public. See the security note above.
create policy "public read seasons" on seasons for select using (true);
create policy "public insert seasons" on seasons for insert with check (true);
create policy "public update seasons" on seasons for update using (true) with check (true);

-- Standings for a group. Pass null for all-time, or a season id to scope to it.
--
-- Note for anyone reading the app code: scoped to a season this returns only
-- members who have a result in that season. A member with no results has no
-- rows to match, so the season filter removes them entirely. The app reconciles
-- what comes back against the roster and shows the missing people at 0-0, so
-- nobody disappears from the board mid-season.
create or replace function public.get_standings(p_group_id uuid, p_season_id uuid default null)
returns table (member_id uuid, name text, wins bigint, losses bigint, net bigint)
language sql
stable
set search_path to 'public'
as $function$
  select
    m.id as member_id,
    m.name,
    count(*) filter (where rp.side = 'win') as wins,
    count(*) filter (where rp.side = 'lose') as losses,
    count(*) filter (where rp.side = 'win') - count(*) filter (where rp.side = 'lose') as net
  from members m
  left join result_participants rp on rp.member_id = m.id
  left join results r on r.id = rp.result_id
  where m.group_id = p_group_id
    and (p_season_id is null or r.season_id is not distinct from p_season_id)
  group by m.id, m.name;
$function$;

-- How often each of two people has beaten the other directly.
create or replace function public.get_head_to_head(p_member_a uuid, p_member_b uuid)
returns table (a_wins bigint, b_wins bigint)
language sql
stable
set search_path to 'public'
as $function$
  select
    count(*) filter (where w.member_id = p_member_a and l.member_id = p_member_b) as a_wins,
    count(*) filter (where w.member_id = p_member_b and l.member_id = p_member_a) as b_wins
  from result_participants w
  join result_participants l on l.result_id = w.result_id and l.side = 'lose'
  where w.side = 'win';
$function$;

-- The result where this person beat the most opponents at once.
create or replace function public.get_best_win(p_member_id uuid)
returns table (result_id uuid, note text, created_at timestamptz, opponents_beaten bigint)
language sql
stable
set search_path to 'public'
as $function$
  select r.id, r.note, r.created_at, count(l.member_id) as opponents_beaten
  from result_participants w
  join results r on r.id = w.result_id
  join result_participants l on l.result_id = w.result_id and l.side = 'lose'
  where w.side = 'win' and w.member_id = p_member_id
  group by r.id, r.note, r.created_at
  order by opponents_beaten desc, r.created_at desc
  limit 1;
$function$;

-- The result where the most people beat this person at once.
create or replace function public.get_worst_loss(p_member_id uuid)
returns table (result_id uuid, note text, created_at timestamptz, opponents_faced bigint)
language sql
stable
set search_path to 'public'
as $function$
  select r.id, r.note, r.created_at, count(w.member_id) as opponents_faced
  from result_participants l
  join results r on r.id = l.result_id
  join result_participants w on w.result_id = l.result_id and w.side = 'win'
  where l.side = 'lose' and l.member_id = p_member_id
  group by r.id, r.note, r.created_at
  order by opponents_faced desc, r.created_at desc
  limit 1;
$function$;
