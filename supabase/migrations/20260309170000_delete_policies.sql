drop policy if exists points_delete_test_accounts on public.collection_points;
create policy points_delete_test_accounts
on public.collection_points
for delete
using (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

drop policy if exists reviews_delete_test_accounts on public.reviews;
create policy reviews_delete_test_accounts
on public.reviews
for delete
using (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

drop policy if exists reports_delete_test_accounts on public.reports;
create policy reports_delete_test_accounts
on public.reports
for delete
using (user_id in ('test-owner', 'test-reviewer', 'test-reporter'));

drop policy if exists photos_delete_test_accounts on public.photos;
create policy photos_delete_test_accounts
on public.photos
for delete
using (
  exists (
    select 1
    from public.collection_points cp
    where cp.id = point_id
      and cp.user_id in ('test-owner', 'test-reviewer', 'test-reporter')
  )
);
