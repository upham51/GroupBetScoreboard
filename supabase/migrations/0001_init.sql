-- Group bet scoreboard: initial schema.
--
-- This migration is kept here for reference and for local development parity
-- (supabase db reset). The hosted project already has it applied.
--
-- SECURITY NOTE, READ BEFORE CHANGING ANYTHING BELOW:
-- This app has no accounts, no login, and no server-side identity of any kind.
-- The RLS policies at the bottom of this file are intentionally wide open:
-- anyone holding the anon key can read and insert rows in every table. That is
-- the product, not an oversight. A group's board is protected only by the fact
-- that its slug is unguessable-ish and shared privately in a group chat.
-- Whoever logs a result is trusted; there is no dispute or settlement flow and
-- no money is handled anywhere. If this ever grows accounts, real stakes, or
-- anything worth lying about, these policies must be replaced first.

create extension if not exists "pgcrypto";

create table groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table results (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table result_participants (
  result_id uuid not null references results(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  side text not null check (side in ('win', 'lose')),
  primary key (result_id, member_id)
);

create index idx_members_group on members(group_id);
create index idx_results_group on results(group_id);
create index idx_result_participants_member on result_participants(member_id);

create view standings with (security_invoker = true) as
select
  m.id as member_id,
  m.group_id,
  m.name,
  count(*) filter (where rp.side = 'win') as wins,
  count(*) filter (where rp.side = 'lose') as losses,
  count(*) filter (where rp.side = 'win') - count(*) filter (where rp.side = 'lose') as net
from members m
left join result_participants rp on rp.member_id = m.id
group by m.id, m.group_id, m.name;

alter table groups enable row level security;
alter table members enable row level security;
alter table results enable row level security;
alter table result_participants enable row level security;

-- Intentionally public. See the security note at the top of this file.
create policy "public read groups" on groups for select using (true);
create policy "public insert groups" on groups for insert with check (true);
create policy "public read members" on members for select using (true);
create policy "public insert members" on members for insert with check (true);
create policy "public read results" on results for select using (true);
create policy "public insert results" on results for insert with check (true);
create policy "public read result_participants" on result_participants for select using (true);
create policy "public insert result_participants" on result_participants for insert with check (true);
