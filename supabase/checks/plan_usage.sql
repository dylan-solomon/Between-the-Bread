-- How much of the Supabase free plan the site is using.
-- Read-only: run it in the Supabase SQL editor whenever you want a check-up.
-- Egress (data sent to visitors) is not visible to SQL; read it from Organization > Usage in the dashboard.
WITH limits AS (
  SELECT 500.0 AS database_mb, 1024.0 AS storage_mb, 50000 AS monthly_users
),
storage_use AS (
  SELECT bucket_id, COUNT(*) AS files, COALESCE(SUM((metadata->>'size')::bigint), 0) AS bytes
  FROM storage.objects
  GROUP BY bucket_id
),
table_sizes AS (
  SELECT c.relname AS name, pg_total_relation_size(c.oid) AS bytes
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
row_counts(name, total) AS (
  SELECT 'Encyclopedia entries', COUNT(*) FROM sandwich_database
  UNION ALL SELECT 'Community sandwiches', COUNT(*) FROM community_sandwiches
  UNION ALL SELECT 'Saved sandwiches', COUNT(*) FROM saved_sandwiches
  UNION ALL SELECT 'Shared sandwiches', COUNT(*) FROM shared_sandwiches
  UNION ALL SELECT 'Ratings', COUNT(*) FROM ratings
  UNION ALL SELECT 'Comments', COUNT(*) FROM comments
  UNION ALL SELECT 'User photos', COUNT(*) FROM photos
  UNION ALL SELECT 'Blog posts', COUNT(*) FROM blog_posts
  UNION ALL SELECT 'Search rate-limit records (should stay small)', COUNT(*) FROM rate_limit_hits
  UNION ALL SELECT 'Login attempt records (should stay small)', COUNT(*) FROM login_attempts
),
report(sort, item, value, free_plan_limit, percent_used) AS (
  SELECT 10, 'Database size',
         ROUND(pg_database_size(current_database()) / 1048576.0, 1) || ' MB',
         limits.database_mb::int || ' MB',
         ROUND(pg_database_size(current_database()) / 1048576.0 / limits.database_mb * 100, 1) || '%'
  FROM limits
  UNION ALL
  SELECT 20, 'File storage, all buckets',
         ROUND(COALESCE(SUM(bytes), 0) / 1048576.0, 1) || ' MB in ' || COALESCE(SUM(files), 0) || ' files',
         limits.storage_mb::int || ' MB',
         ROUND(COALESCE(SUM(bytes), 0) / 1048576.0 / limits.storage_mb * 100, 1) || '%'
  FROM limits LEFT JOIN storage_use ON true
  GROUP BY limits.storage_mb
  UNION ALL
  SELECT 21, '  bucket: ' || bucket_id, ROUND(bytes / 1048576.0, 1) || ' MB in ' || files || ' files', '', ''
  FROM storage_use
  UNION ALL
  SELECT 30, 'People signed in during the last 30 days',
         COUNT(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days')::text,
         limits.monthly_users::text,
         ROUND(COUNT(*) FILTER (WHERE last_sign_in_at > now() - interval '30 days') * 100.0 / limits.monthly_users, 2) || '%'
  FROM limits LEFT JOIN auth.users ON true
  GROUP BY limits.monthly_users
  UNION ALL
  SELECT 31, 'Accounts in total', COUNT(*)::text, '', '' FROM auth.users
  UNION ALL
  SELECT 40 + position, 'Largest table: ' || name, ROUND(bytes / 1048576.0, 2) || ' MB', '', ''
  FROM (SELECT name, bytes, ROW_NUMBER() OVER (ORDER BY bytes DESC, name)::int AS position FROM table_sizes) AS largest
  WHERE position <= 5
  UNION ALL
  SELECT 50, name, total::text, '', '' FROM row_counts
)
SELECT item, value, free_plan_limit, percent_used
FROM report
ORDER BY sort, item;
