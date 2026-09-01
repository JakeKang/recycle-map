do $$
begin
  if has_table_privilege('anon', 'public.profiles', 'SELECT')
    or has_table_privilege('anon', 'public.collection_points', 'INSERT')
    or has_table_privilege('anon', 'public.reports', 'SELECT')
    or has_table_privilege('anon', 'public.legacy_user_identity_mappings', 'SELECT')
    or has_table_privilege('authenticated', 'public.reports', 'UPDATE') then
    raise exception 'browser database roles retain internal table privileges';
  end if;

  if not has_table_privilege('service_role', 'public.collection_points', 'SELECT,INSERT,UPDATE,DELETE')
    or not has_table_privilege('service_role', 'public.app_uploads', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'service role is missing required application privileges';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.reports'::regclass
      and tgname = 'trigger_enforce_single_report_per_user'
      and not tgisinternal
  ) then
    raise exception 'report uniqueness trigger is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'collection_points'
      and column_name = 'photo_ids'
  ) then
    raise exception 'photo_ids column is missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.consume_security_rate_limit(text,bigint,integer)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute the security rate limiter';
  end if;

  if has_function_privilege(
    'anon',
    'public.create_collection_point_with_photos(text,text,point_category,text,double precision,double precision,text,uuid[])',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.migrate_legacy_user_identity(text,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.finalize_sensitive_data_encryption()',
    'EXECUTE'
  ) then
    raise exception 'anon can execute a service-only application function';
  end if;

  if not exists (
    select 1
    from public.point_suggestions
    where id = '21000000-0000-4000-8000-000000000001'
      and payload_ciphertext like '{%legacy suggestion%'
  ) then
    raise exception 'legacy JSON suggestion was not migrated';
  end if;

  if not exists (
    select 1
    from public.reports
    where id = '21000000-0000-4000-8000-000000000002'
      and type = 'other'
  ) then
    raise exception 'ordinary type=other report was incorrectly migrated or deleted';
  end if;

  if (
    select count(*)
    from public.reports
    where user_id = 'duplicate-report-user'
      and point_id = '20000000-0000-4000-8000-000000000001'
  ) <> 2 then
    raise exception 'historical duplicate reports were deleted';
  end if;
end $$;

insert into public.profiles (id, nickname, provider)
values ('provider-collision-subject', 'Provider collision fixture', 'nextauth');
insert into public.legacy_user_identity_mappings (
  legacy_id,
  provider,
  namespaced_id,
  approved_by
)
values (
  'provider-collision-subject',
  'google',
  'google:provider-collision-subject',
  'db-security-test'
);

do $$
begin
  if public.migrate_legacy_user_identity(
    'provider-collision-subject',
    'kakao:provider-collision-subject',
    'kakao'
  ) then
    raise exception 'a different provider claimed an approved legacy identity';
  end if;

  if not exists (
    select 1 from public.profiles where id = 'provider-collision-subject'
  ) then
    raise exception 'different-provider login changed legacy ownership';
  end if;
end $$;

insert into public.profiles (id, nickname, provider)
values ('unapproved-legacy-subject', 'Unapproved OAuth user', 'nextauth');

do $$
begin
  begin
    perform public.migrate_legacy_user_identity(
      'unapproved-legacy-subject',
      'kakao:unapproved-legacy-subject',
      'kakao'
    );
    raise exception 'unapproved legacy identity migration unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then null;
  end;

  if not exists (
    select 1 from public.profiles where id = 'unapproved-legacy-subject'
  ) or exists (
    select 1 from public.profiles where id = 'kakao:unapproved-legacy-subject'
  ) then
    raise exception 'unapproved legacy identity migration changed ownership';
  end if;
end $$;

update public.reports
set reason = 'enc:v1:test:test:test'
where reason is not null;
update public.point_suggestions
set payload_ciphertext = 'enc:v1:test:test:test';

select public.finalize_sensitive_data_encryption();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname in (
      'reports_reason_encrypted',
      'point_suggestions_payload_encrypted',
      'security_audit_details_encrypted',
      'app_uploads_original_name_encrypted'
    )
      and not convalidated
  ) then
    raise exception 'sensitive data encryption constraints were not validated';
  end if;
end $$;

insert into public.profiles (id, nickname, provider)
values ('atomic-photo-user', 'Atomic photo user', 'nextauth');

insert into public.app_uploads (
  id,
  owner_id,
  object_path,
  original_name,
  mime_type,
  declared_size,
  stored_size,
  status
)
values (
  '22000000-0000-4000-8000-000000000001',
  'atomic-photo-user',
  'atomic-photo-user/photo.webp',
  'enc:v1:test:test:test',
  'image/webp',
  1024,
  1024,
  'ready'
);

select public.create_collection_point_with_photos(
  'atomic-photo-user',
  'Atomic point',
  'battery',
  'Created transactionally',
  37.5,
  127.0,
  'Seoul',
  array['22000000-0000-4000-8000-000000000001']::uuid[]
);

do $$
begin
  if not exists (
    select 1 from public.app_uploads
    where id = '22000000-0000-4000-8000-000000000001'
      and status = 'attached'
      and point_id is not null
  ) then
    raise exception 'atomic point function did not attach the photo';
  end if;

  begin
    perform public.create_collection_point_with_photos(
      'atomic-photo-user',
      'Must roll back',
      'battery',
      null,
      37.6,
      127.1,
      'Seoul',
      array['22000000-0000-4000-8000-000000000001']::uuid[]
    );
    raise exception 'photo reuse unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then null;
  end;

  if exists (
    select 1 from public.collection_points where title = 'Must roll back'
  ) then
    raise exception 'failed atomic point creation left a point behind';
  end if;
end $$;

insert into public.profiles (id, nickname, provider)
values ('legacy-oauth-subject', 'Legacy OAuth user', 'nextauth');

insert into public.collection_points (
  user_id,
  title,
  category,
  lat,
  lng,
  geom,
  status
)
values (
  'legacy-oauth-subject',
  'Legacy owned point',
  'battery',
  37.7,
  127.2,
  st_setsrid(st_makepoint(127.2, 37.7), 4326),
  'active'
);

insert into public.legacy_user_identity_mappings (
  legacy_id,
  provider,
  namespaced_id,
  approved_by
)
values (
  'legacy-oauth-subject',
  'google',
  'google:legacy-oauth-subject',
  'db-security-test'
);

select public.migrate_legacy_user_identity(
  'legacy-oauth-subject',
  'google:legacy-oauth-subject',
  'google'
);

do $$
begin
  if exists (select 1 from public.profiles where id = 'legacy-oauth-subject')
    or not exists (select 1 from public.profiles where id = 'google:legacy-oauth-subject')
    or not exists (
      select 1 from public.collection_points
      where title = 'Legacy owned point'
        and user_id = 'google:legacy-oauth-subject'
    ) or not exists (
      select 1 from public.legacy_user_identity_mappings
      where legacy_id = 'legacy-oauth-subject'
        and migrated_at is not null
    ) then
    raise exception 'legacy OAuth ownership migration failed';
  end if;
end $$;
