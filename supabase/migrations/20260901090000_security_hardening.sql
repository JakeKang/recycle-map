begin;

-- The application is the only database boundary. Browser roles must not access
-- internal tables directly because NextAuth identities are not Supabase Auth identities.
alter table public.collection_points
  add column if not exists photo_ids uuid[] not null default '{}'::uuid[];

alter table public.reports
  drop constraint if exists reports_reason_check;

-- Recreate the legacy report trigger function with explicit enum casts. Some
-- PostgreSQL versions otherwise infer the CASE result as text at execution.
create or replace function public.sync_report_state()
returns trigger
language plpgsql
set search_path = public
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
      status = case
        when pending_count >= 5 then 'reported'::point_status
        else 'active'::point_status
      end,
      updated_at = now()
  where id = target_point_id;

  return coalesce(new, old);
end;
$$;

create table if not exists public.point_suggestions (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.collection_points(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  payload_ciphertext text not null,
  status report_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function pg_temp.is_legacy_point_suggestion(p_reason text)
returns boolean
language plpgsql
as $$
declare
  payload jsonb;
begin
  if p_reason is null then
    return false;
  end if;

  payload := p_reason::jsonb;
  return jsonb_typeof(payload) = 'object'
    and payload->>'category' in (
      'battery',
      'electronics',
      'medicine',
      'fluorescent',
      'toner',
      'other'
    )
    and (not payload ? 'address' or jsonb_typeof(payload->'address') = 'string')
    and (not payload ? 'description' or jsonb_typeof(payload->'description') = 'string')
    and not exists (
      select 1
      from jsonb_object_keys(payload) as key
      where key not in ('category', 'address', 'description')
    );
exception
  when others then
    return false;
end;
$$;

insert into public.point_suggestions (
  id,
  point_id,
  user_id,
  payload_ciphertext,
  status,
  created_at,
  updated_at
)
select
  id,
  point_id,
  user_id,
  coalesce(reason, '{"category":"other"}'),
  status,
  created_at,
  created_at
from public.reports
where type = 'other'
  and pg_temp.is_legacy_point_suggestion(reason);

delete from public.reports
where type = 'other'
  and pg_temp.is_legacy_point_suggestion(reason);

create or replace function public.enforce_single_report_per_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('report:' || new.point_id::text || ':' || new.user_id, 0)
  );
  if exists (
    select 1
    from public.reports
    where point_id = new.point_id
      and user_id = new.user_id
  ) then
    raise exception 'duplicate report for point and user' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_enforce_single_report_per_user on public.reports;
create trigger trigger_enforce_single_report_per_user
before insert on public.reports
for each row execute function public.enforce_single_report_per_user();

create or replace function public.enforce_single_suggestion_per_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('suggestion:' || new.point_id::text || ':' || new.user_id, 0)
  );
  if exists (
    select 1
    from public.point_suggestions
    where point_id = new.point_id
      and user_id = new.user_id
  ) then
    raise exception 'duplicate suggestion for point and user' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_enforce_single_suggestion_per_user on public.point_suggestions;
create trigger trigger_enforce_single_suggestion_per_user
before insert on public.point_suggestions
for each row execute function public.enforce_single_suggestion_per_user();

create table if not exists public.app_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references public.profiles(id) on delete cascade,
  point_id uuid references public.collection_points(id) on delete set null,
  object_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  declared_size bigint not null check (declared_size between 1 and 52428800),
  stored_size bigint check (stored_size between 1 and 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending', 'ready', 'attached', 'rejected')),
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'point-photos',
  'point-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists idx_app_uploads_owner_created
on public.app_uploads (owner_id, created_at desc);
create index if not exists idx_app_uploads_expiry
on public.app_uploads (status, expires_at);

create table if not exists public.legacy_user_identity_mappings (
  legacy_id text primary key,
  provider text not null check (provider in ('google', 'kakao', 'naver')),
  namespaced_id text not null unique,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  migrated_at timestamptz,
  check (
    namespaced_id = provider || ':' || legacy_id
    or namespaced_id = 'sha256:' || encode(
      sha256(convert_to(provider || ':' || legacy_id, 'UTF8')),
      'hex'
    )
  )
);

create or replace function public.create_collection_point_with_photos(
  p_user_id text,
  p_title text,
  p_category public.point_category,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_address text,
  p_photo_ids uuid[]
)
returns setof public.collection_points
language plpgsql
set search_path = public
as $$
declare
  normalized_photo_ids uuid[] := coalesce(p_photo_ids, '{}'::uuid[]);
  matching_upload_count integer;
  updated_upload_count integer;
  created_point public.collection_points%rowtype;
begin
  if cardinality(normalized_photo_ids) > 5
    or (
      select count(distinct photo_id)
      from unnest(normalized_photo_ids) as photo_id
    ) <> cardinality(normalized_photo_ids) then
    raise exception 'invalid photo id list' using errcode = 'P0001';
  end if;

  if cardinality(normalized_photo_ids) > 0 then
    perform 1
    from public.app_uploads
    where id = any(normalized_photo_ids)
    order by id
    for update;

    select count(*)
    into matching_upload_count
    from public.app_uploads
    where id = any(normalized_photo_ids)
      and owner_id = p_user_id
      and status = 'ready';

    if matching_upload_count <> cardinality(normalized_photo_ids) then
      raise exception 'photo is not ready or is owned by another user' using errcode = 'P0001';
    end if;
  end if;

  insert into public.collection_points (
    user_id,
    title,
    category,
    description,
    lat,
    lng,
    address,
    status,
    photo_ids
  )
  values (
    p_user_id,
    p_title,
    p_category,
    p_description,
    p_lat,
    p_lng,
    p_address,
    'active',
    normalized_photo_ids
  )
  returning * into created_point;

  if cardinality(normalized_photo_ids) > 0 then
    update public.app_uploads
    set status = 'attached',
        point_id = created_point.id,
        updated_at = now()
    where id = any(normalized_photo_ids)
      and owner_id = p_user_id
      and status = 'ready';
    get diagnostics updated_upload_count = row_count;

    if updated_upload_count <> cardinality(normalized_photo_ids) then
      raise exception 'failed to attach every photo' using errcode = 'P0001';
    end if;
  end if;

  return next created_point;
end;
$$;

create or replace function public.migrate_legacy_user_identity(
  p_legacy_id text,
  p_new_id text,
  p_provider text
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  legacy_profile public.profiles%rowtype;
  approved_mapping public.legacy_user_identity_mappings%rowtype;
begin
  if p_legacy_id is null
    or p_new_id is null
    or p_provider is null
    or char_length(p_legacy_id) < 1
    or char_length(p_new_id) < 3
    or char_length(p_new_id) > 190
    or p_legacy_id = p_new_id
    or (
      p_new_id <> p_provider || ':' || p_legacy_id
      and p_new_id <> 'sha256:' || encode(
        sha256(convert_to(p_provider || ':' || p_legacy_id, 'UTF8')),
        'hex'
      )
    ) then
    raise exception 'invalid legacy identity migration request' using errcode = 'P0001';
  end if;

  select *
  into legacy_profile
  from public.profiles
  where id = p_legacy_id
  for update;

  if not found then
    return false;
  end if;

  select *
  into approved_mapping
  from public.legacy_user_identity_mappings
  where legacy_id = p_legacy_id
  for update;

  if not found then
    raise exception 'approved legacy identity mapping is required' using errcode = 'P0001';
  end if;

  if approved_mapping.provider <> p_provider
    or approved_mapping.namespaced_id <> p_new_id then
    return false;
  end if;

  if approved_mapping.migrated_at is not null then
    raise exception 'legacy identity mapping was already migrated' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.profiles where id = p_new_id) then
    raise exception 'both legacy and namespaced profiles already exist' using errcode = 'P0001';
  end if;

  insert into public.profiles (
    id,
    nickname,
    avatar_url,
    provider,
    is_admin,
    created_at,
    updated_at
  )
  values (
    p_new_id,
    legacy_profile.nickname,
    legacy_profile.avatar_url,
    p_provider,
    legacy_profile.is_admin,
    legacy_profile.created_at,
    now()
  );

  update public.collection_points set user_id = p_new_id where user_id = p_legacy_id;
  update public.reviews set user_id = p_new_id where user_id = p_legacy_id;
  update public.reports set user_id = p_new_id where user_id = p_legacy_id;
  update public.point_verification_votes set user_id = p_new_id where user_id = p_legacy_id;
  update public.point_suggestions set user_id = p_new_id where user_id = p_legacy_id;
  update public.app_uploads set owner_id = p_new_id where owner_id = p_legacy_id;
  update public.security_audit_events set actor_id = p_new_id where actor_id = p_legacy_id;
  update public.legacy_user_identity_mappings
  set migrated_at = now()
  where legacy_id = p_legacy_id;
  delete from public.profiles where id = p_legacy_id;

  return true;
end;
$$;

create or replace function public.enforce_upload_daily_quota()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  upload_count integer;
  upload_bytes bigint;
begin
  perform pg_advisory_xact_lock(hashtextextended('upload:' || new.owner_id, 0));
  select count(*), coalesce(sum(declared_size), 0)
  into upload_count, upload_bytes
  from public.app_uploads
  where owner_id = new.owner_id
    and created_at >= date_trunc('day', now());

  if upload_count >= 20 or upload_bytes + new.declared_size > 524288000 then
    raise exception 'daily upload quota exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_enforce_upload_daily_quota on public.app_uploads;
create trigger trigger_enforce_upload_daily_quota
before insert on public.app_uploads
for each row execute function public.enforce_upload_daily_quota();

create or replace function public.enforce_point_daily_quota()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  point_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('point:' || new.user_id, 0));
  select count(*) into point_count
  from public.collection_points
  where user_id = new.user_id
    and created_at >= date_trunc('day', now());

  if point_count >= 5 then
    raise exception 'daily point quota exceeded' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_enforce_point_daily_quota on public.collection_points;
create trigger trigger_enforce_point_daily_quota
before insert on public.collection_points
for each row execute function public.enforce_point_daily_quota();

create table if not exists public.security_rate_limits (
  key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);

create or replace function public.consume_security_rate_limit(
  p_key text,
  p_window_ms bigint,
  p_max integer
)
returns table (allowed boolean, remaining integer, retry_after_sec integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.security_rate_limits%rowtype;
  current_time timestamptz := clock_timestamp();
  window_interval interval := make_interval(secs => p_window_ms::numeric / 1000);
begin
  if char_length(p_key) > 300 or p_window_ms < 1000 or p_max < 1 then
    raise exception 'invalid rate limit rule';
  end if;

  insert into public.security_rate_limits (key, window_started_at, request_count, updated_at)
  values (p_key, current_time, 1, current_time)
  on conflict (key) do nothing;

  select * into current_row
  from public.security_rate_limits
  where key = p_key
  for update;

  if current_row.window_started_at + window_interval <= current_time then
    update public.security_rate_limits
    set window_started_at = current_time,
        request_count = 1,
        updated_at = current_time
    where key = p_key;
    return query select true, greatest(0, p_max - 1), ceil(p_window_ms / 1000.0)::integer;
    return;
  end if;

  if current_row.request_count >= p_max then
    return query select
      false,
      0,
      greatest(
        1,
        ceil(extract(epoch from (current_row.window_started_at + window_interval - current_time)))::integer
      );
    return;
  end if;

  update public.security_rate_limits
  set request_count = request_count + 1,
      updated_at = current_time
  where key = p_key
  returning * into current_row;

  return query select
    true,
    greatest(0, p_max - current_row.request_count),
    greatest(
      1,
      ceil(extract(epoch from (current_row.window_started_at + window_interval - current_time)))::integer
    );
end;
$$;

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  outcome text not null check (outcome in ('success', 'denied', 'failure')),
  encrypted_details text,
  created_at timestamptz not null default now()
);

alter table public.reports
  drop constraint if exists reports_reason_encrypted;
alter table public.reports
  add constraint reports_reason_encrypted
  check (reason is null or reason like 'enc:v%:%') not valid;

alter table public.point_suggestions
  drop constraint if exists point_suggestions_payload_encrypted;
alter table public.point_suggestions
  add constraint point_suggestions_payload_encrypted
  check (payload_ciphertext like 'enc:v%:%') not valid;

alter table public.security_audit_events
  drop constraint if exists security_audit_details_encrypted;
alter table public.security_audit_events
  add constraint security_audit_details_encrypted
  check (encrypted_details is null or encrypted_details like 'enc:v%:%') not valid;

alter table public.app_uploads
  drop constraint if exists app_uploads_original_name_encrypted;
alter table public.app_uploads
  add constraint app_uploads_original_name_encrypted
  check (original_name like 'enc:v%:%') not valid;

create or replace function public.finalize_sensitive_data_encryption()
returns void
language plpgsql
set search_path = public
as $$
begin
  alter table public.reports validate constraint reports_reason_encrypted;
  alter table public.point_suggestions validate constraint point_suggestions_payload_encrypted;
  alter table public.security_audit_events validate constraint security_audit_details_encrypted;
  alter table public.app_uploads validate constraint app_uploads_original_name_encrypted;
end;
$$;

alter table public.profiles enable row level security;
alter table public.collection_points enable row level security;
alter table public.photos enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.point_verification_votes enable row level security;
alter table public.point_suggestions enable row level security;
alter table public.app_uploads enable row level security;
alter table public.security_rate_limits enable row level security;
alter table public.security_audit_events enable row level security;
alter table public.legacy_user_identity_mappings enable row level security;

alter table public.profiles force row level security;
alter table public.collection_points force row level security;
alter table public.photos force row level security;
alter table public.reviews force row level security;
alter table public.reports force row level security;
alter table public.point_verification_votes force row level security;
alter table public.point_suggestions force row level security;
alter table public.app_uploads force row level security;
alter table public.security_rate_limits force row level security;
alter table public.security_audit_events force row level security;
alter table public.legacy_user_identity_mappings force row level security;

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_insert_test_accounts on public.profiles;
drop policy if exists profiles_update_test_accounts on public.profiles;

drop policy if exists points_select_active on public.collection_points;
drop policy if exists points_insert_own on public.collection_points;
drop policy if exists points_update_own on public.collection_points;
drop policy if exists points_select_all_mvp on public.collection_points;
drop policy if exists points_insert_test_accounts on public.collection_points;
drop policy if exists points_update_test_accounts on public.collection_points;
drop policy if exists points_delete_test_accounts on public.collection_points;

drop policy if exists photos_select_all on public.photos;
drop policy if exists photos_insert_point_owner on public.photos;
drop policy if exists photos_insert_test_accounts on public.photos;
drop policy if exists photos_delete_test_accounts on public.photos;

drop policy if exists reviews_select_all on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reviews_insert_test_accounts on public.reviews;
drop policy if exists reviews_update_test_accounts on public.reviews;
drop policy if exists reviews_delete_test_accounts on public.reviews;

drop policy if exists reports_select_own_or_admin on public.reports;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists reports_update_admin on public.reports;
drop policy if exists reports_select_all_mvp on public.reports;
drop policy if exists reports_insert_test_accounts on public.reports;
drop policy if exists reports_delete_test_accounts on public.reports;

drop policy if exists verification_votes_select_own on public.point_verification_votes;
drop policy if exists verification_votes_insert_own on public.point_verification_votes;
drop policy if exists verification_votes_update_own on public.point_verification_votes;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.collection_points from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.reports from anon, authenticated;
revoke all on table public.point_verification_votes from anon, authenticated;
revoke all on table public.point_suggestions from anon, authenticated;
revoke all on table public.app_uploads from anon, authenticated;
revoke all on table public.security_rate_limits from anon, authenticated;
revoke all on table public.security_audit_events from anon, authenticated;
revoke all on table public.legacy_user_identity_mappings from anon, authenticated;

revoke all on function public.consume_security_rate_limit(text, bigint, integer) from public, anon, authenticated;
revoke all on function public.update_geom_and_timestamp() from public, anon, authenticated;
revoke all on function public.update_point_rating() from public, anon, authenticated;
revoke all on function public.sync_report_state() from public, anon, authenticated;
revoke all on function public.touch_point_verification_vote() from public, anon, authenticated;
revoke all on function public.sync_point_verification_state() from public, anon, authenticated;
revoke all on function public.enforce_upload_daily_quota() from public, anon, authenticated;
revoke all on function public.enforce_point_daily_quota() from public, anon, authenticated;
revoke all on function public.enforce_single_report_per_user() from public, anon, authenticated;
revoke all on function public.enforce_single_suggestion_per_user() from public, anon, authenticated;
revoke all on function public.create_collection_point_with_photos(text, text, point_category, text, double precision, double precision, text, uuid[]) from public, anon, authenticated;
revoke all on function public.migrate_legacy_user_identity(text, text, text) from public, anon, authenticated;
revoke all on function public.finalize_sensitive_data_encryption() from public, anon, authenticated;
grant execute on function public.consume_security_rate_limit(text, bigint, integer) to service_role;
grant execute on function public.create_collection_point_with_photos(text, text, point_category, text, double precision, double precision, text, uuid[]) to service_role;
grant execute on function public.migrate_legacy_user_identity(text, text, text) to service_role;
grant execute on function public.finalize_sensitive_data_encryption() to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant all on table public.profiles to service_role;
grant all on table public.collection_points to service_role;
grant all on table public.photos to service_role;
grant all on table public.reviews to service_role;
grant all on table public.reports to service_role;
grant all on table public.point_verification_votes to service_role;
grant all on table public.point_suggestions to service_role;
grant all on table public.app_uploads to service_role;
grant all on table public.security_rate_limits to service_role;
grant all on table public.security_audit_events to service_role;
grant all on table public.legacy_user_identity_mappings to service_role;

commit;
