alter table public.profiles enable row level security;
alter table public.collection_points enable row level security;
alter table public.photos enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
on public.profiles
for select
using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
with check (auth.uid()::text = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
using (auth.uid()::text = id)
with check (auth.uid()::text = id);

drop policy if exists points_select_active on public.collection_points;
create policy points_select_active
on public.collection_points
for select
using (status = 'active' or auth.uid()::text = user_id);

drop policy if exists points_insert_own on public.collection_points;
create policy points_insert_own
on public.collection_points
for insert
with check (auth.uid()::text = user_id);

drop policy if exists points_update_own on public.collection_points;
create policy points_update_own
on public.collection_points
for update
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists photos_select_all on public.photos;
create policy photos_select_all
on public.photos
for select
using (true);

drop policy if exists photos_insert_point_owner on public.photos;
create policy photos_insert_point_owner
on public.photos
for insert
with check (
  exists (
    select 1
    from public.collection_points cp
    where cp.id = point_id
      and cp.user_id = auth.uid()::text
  )
);

drop policy if exists reviews_select_all on public.reviews;
create policy reviews_select_all
on public.reviews
for select
using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own
on public.reviews
for insert
with check (auth.uid()::text = user_id);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own
on public.reviews
for update
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id);

drop policy if exists reports_select_own_or_admin on public.reports;
create policy reports_select_own_or_admin
on public.reports
for select
using (
  auth.uid()::text = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()::text
      and p.is_admin = true
  )
);

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own
on public.reports
for insert
with check (auth.uid()::text = user_id);

drop policy if exists reports_update_admin on public.reports;
create policy reports_update_admin
on public.reports
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()::text
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()::text
      and p.is_admin = true
  )
);
