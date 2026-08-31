do $$
begin
  create type point_verification_status as enum ('pending', 'verified', 'inaccurate');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type point_verification_vote_value as enum ('accurate', 'inaccurate');
exception
  when duplicate_object then null;
end $$;

alter table public.collection_points
  add column if not exists verification_status point_verification_status not null default 'pending',
  add column if not exists accurate_vote_count integer not null default 0,
  add column if not exists inaccurate_vote_count integer not null default 0,
  add column if not exists verification_override point_verification_status;

update public.collection_points
set verification_status = case
  when verified_at is not null then 'verified'::point_verification_status
  else 'pending'::point_verification_status
end;

create table if not exists public.point_verification_votes (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  value point_verification_vote_value not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (point_id, user_id)
);

create index if not exists idx_point_verification_votes_point
on public.point_verification_votes (point_id, value);

create index if not exists idx_point_verification_votes_user
on public.point_verification_votes (user_id, updated_at desc);

create or replace function public.touch_point_verification_vote()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trigger_touch_point_verification_vote
on public.point_verification_votes;
create trigger trigger_touch_point_verification_vote
before update on public.point_verification_votes
for each row execute function public.touch_point_verification_vote();

create or replace function public.sync_point_verification_state()
returns trigger
language plpgsql
as $$
declare
  target_point_id uuid;
  accurate_count integer;
  inaccurate_count integer;
  total_count integer;
  override_status point_verification_status;
  derived_status point_verification_status;
  next_status point_verification_status;
begin
  target_point_id := coalesce(new.point_id, old.point_id);

  select
    count(*) filter (where value = 'accurate'),
    count(*) filter (where value = 'inaccurate')
  into accurate_count, inaccurate_count
  from public.point_verification_votes
  where point_id = target_point_id;

  total_count := accurate_count + inaccurate_count;

  if inaccurate_count >= 3 then
    derived_status := 'inaccurate';
  elsif accurate_count >= 5
    and total_count > 0
    and accurate_count::numeric / total_count::numeric >= 0.7 then
    derived_status := 'verified';
  else
    derived_status := 'pending';
  end if;

  select verification_override
  into override_status
  from public.collection_points
  where id = target_point_id;

  next_status := coalesce(override_status, derived_status);

  update public.collection_points
  set accurate_vote_count = accurate_count,
      inaccurate_vote_count = inaccurate_count,
      verification_status = next_status,
      verified_at = case
        when next_status = 'verified' then coalesce(verified_at, now())
        else null
      end,
      updated_at = now()
  where id = target_point_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_sync_point_verification_state
on public.point_verification_votes;
create trigger trigger_sync_point_verification_state
after insert or update of value or delete
on public.point_verification_votes
for each row execute function public.sync_point_verification_state();

alter table public.point_verification_votes enable row level security;

drop policy if exists verification_votes_select_own
on public.point_verification_votes;
create policy verification_votes_select_own
on public.point_verification_votes
for select
using (auth.uid()::text = user_id);

drop policy if exists verification_votes_insert_own
on public.point_verification_votes;
create policy verification_votes_insert_own
on public.point_verification_votes
for insert
with check (
  auth.uid()::text = user_id
  and not exists (
    select 1
    from public.collection_points cp
    where cp.id = point_id
      and cp.user_id = auth.uid()::text
  )
);

drop policy if exists verification_votes_update_own
on public.point_verification_votes;
create policy verification_votes_update_own
on public.point_verification_votes
for update
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);
