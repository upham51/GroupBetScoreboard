-- Caps to stop a runaway script, not to constrain normal use.
--
-- Everything in this app writes with the public anon key and wide-open RLS (see
-- the note at the top of 0001_init.sql), so the Pages Functions are not the only
-- way rows can arrive. These triggers hold regardless of who is inserting,
-- which the Turnstile check in front of the write endpoints cannot do.
--
-- Both caps sit well above anything a friend group would reach. The app's own
-- roster limit is 40 names, under the 50 here.

create or replace function enforce_member_cap()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from members where group_id = new.group_id) >= 50 then
    raise exception 'roster limit reached for this group';
  end if;
  return new;
end;
$$;

create trigger check_member_cap
before insert on members
for each row execute function enforce_member_cap();

create or replace function enforce_result_rate_cap()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from results where group_id = new.group_id
      and created_at > now() - interval '1 day') >= 500 then
    raise exception 'daily result limit reached for this group';
  end if;
  return new;
end;
$$;

create trigger check_result_rate
before insert on results
for each row execute function enforce_result_rate_cap();
