insert into public.profiles (id, nickname, provider)
values
  ('legacy-suggestion-user', 'Legacy suggestion', 'nextauth'),
  ('ordinary-report-user', 'Ordinary report', 'nextauth'),
  ('duplicate-report-user', 'Duplicate reports', 'nextauth')
on conflict (id) do nothing;

insert into public.collection_points (
  id,
  user_id,
  title,
  category,
  description,
  lat,
  lng,
  geom,
  address,
  status
)
values (
  '20000000-0000-4000-8000-000000000001',
  'legacy-suggestion-user',
  'Migration preservation fixture',
  'battery',
  'Used only by the database security test',
  37.5663,
  126.9779,
  st_setsrid(st_makepoint(126.9779, 37.5663), 4326),
  'Seoul',
  'active'
)
on conflict (id) do nothing;

insert into public.reports (id, point_id, user_id, type, reason, status, created_at)
values
  (
    '21000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'legacy-suggestion-user',
    'other',
    '{"category":"electronics","description":"legacy suggestion"}',
    'pending',
    '2026-01-01T00:00:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'ordinary-report-user',
    'other',
    'This is an ordinary free-form report, not a suggestion.',
    'pending',
    '2026-01-02T00:00:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'duplicate-report-user',
    'spam',
    'first historical duplicate',
    'resolved',
    '2026-01-03T00:00:00Z'
  ),
  (
    '21000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'duplicate-report-user',
    'inappropriate',
    'second historical duplicate',
    'dismissed',
    '2026-01-04T00:00:00Z'
  );
