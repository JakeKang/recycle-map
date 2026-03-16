create extension if not exists postgis;
create extension if not exists pgcrypto;

create type point_category as enum (
  'battery',
  'electronics',
  'medicine',
  'fluorescent',
  'toner',
  'other'
);

create type point_status as enum (
  'pending',
  'active',
  'reported',
  'inactive'
);

create type report_type as enum (
  'incorrect_location',
  'no_longer_exists',
  'wrong_category',
  'spam',
  'inappropriate',
  'other'
);

create type report_status as enum ('pending', 'resolved', 'dismissed');

create table if not exists public.profiles (
  id text primary key,
  nickname text not null,
  avatar_url text,
  provider text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_points (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  category point_category not null,
  description text check (char_length(description) <= 500),
  lat double precision not null check (lat between 33.0 and 43.0),
  lng double precision not null check (lng between 124.0 and 132.0),
  geom geometry(Point, 4326) not null,
  address text,
  status point_status not null default 'active',
  avg_rating numeric(2, 1) not null default 0,
  review_count integer not null default 0,
  report_count integer not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_points_geom on public.collection_points using gist (geom);
create index if not exists idx_points_category_status on public.collection_points (category, status);
create index if not exists idx_points_user on public.collection_points (user_id);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  url text not null,
  display_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_photos_point on public.photos (point_id, display_order);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  unique (point_id, user_id)
);

create index if not exists idx_reviews_point on public.reviews (point_id, created_at desc);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  type report_type not null,
  reason text check (char_length(reason) <= 300),
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_point_status on public.reports (point_id, status);

create or replace function public.update_geom_and_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.geom := st_setsrid(st_makepoint(new.lng, new.lat), 4326);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trigger_update_geom on public.collection_points;
create trigger trigger_update_geom
before insert or update of lat, lng
on public.collection_points
for each row
execute function public.update_geom_and_timestamp();

create or replace function public.update_point_rating()
returns trigger
language plpgsql
as $$
declare
  target_point_id uuid;
begin
  target_point_id := coalesce(new.point_id, old.point_id);

  update public.collection_points
  set avg_rating = coalesce((
        select round(avg(r.rating)::numeric, 1)
        from public.reviews r
        where r.point_id = target_point_id
      ), 0),
      review_count = (
        select count(*)
        from public.reviews r
        where r.point_id = target_point_id
      ),
      updated_at = now()
  where id = target_point_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_update_rating on public.reviews;
create trigger trigger_update_rating
after insert or update or delete
on public.reviews
for each row
execute function public.update_point_rating();

create or replace function public.sync_report_state()
returns trigger
language plpgsql
as $$
declare
  target_point_id uuid;
  pending_count integer;
begin
  target_point_id := coalesce(new.point_id, old.point_id);

  select count(*)
  into pending_count
  from public.reports
  where point_id = target_point_id
    and status = 'pending';

  update public.collection_points
  set report_count = pending_count,
      status = case when pending_count >= 5 then 'reported' else 'active' end,
      updated_at = now()
  where id = target_point_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trigger_sync_report_state on public.reports;
create trigger trigger_sync_report_state
after insert or update of status or delete
on public.reports
for each row
execute function public.sync_report_state();
