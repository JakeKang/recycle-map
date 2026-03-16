insert into public.profiles (id, nickname, provider, is_admin)
values
  ('test-owner', '테스트 등록자', 'credentials', false),
  ('test-reviewer', '테스트 리뷰어', 'credentials', false),
  ('test-reporter', '테스트 신고자', 'credentials', false)
on conflict (id)
do update set
  nickname = excluded.nickname,
  provider = excluded.provider;

drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists points_select_active on public.collection_points;
drop policy if exists points_insert_own on public.collection_points;
drop policy if exists points_update_own on public.collection_points;
drop policy if exists photos_insert_point_owner on public.photos;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists reports_select_own_or_admin on public.reports;
drop policy if exists reports_insert_own on public.reports;
drop policy if exists reports_update_admin on public.reports;

create policy profiles_insert_test_accounts
on public.profiles
for insert
with check (id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy profiles_update_test_accounts
on public.profiles
for update
using (id in ('test-owner', 'test-reviewer', 'test-reporter'))
with check (id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy points_select_all_mvp
on public.collection_points
for select
using (true);

create policy points_insert_test_accounts
on public.collection_points
for insert
with check (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy points_update_test_accounts
on public.collection_points
for update
using (user_id in ('test-owner', 'test-reviewer', 'test-reporter'))
with check (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy photos_insert_test_accounts
on public.photos
for insert
with check (
  exists (
    select 1
    from public.collection_points cp
    where cp.id = point_id
      and cp.user_id in ('test-owner', 'test-reviewer', 'test-reporter')
  )
);

create policy reviews_insert_test_accounts
on public.reviews
for insert
with check (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy reviews_update_test_accounts
on public.reviews
for update
using (user_id in ('test-owner', 'test-reviewer', 'test-reporter'))
with check (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

create policy reports_select_all_mvp
on public.reports
for select
using (true);

create policy reports_insert_test_accounts
on public.reports
for insert
with check (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));
