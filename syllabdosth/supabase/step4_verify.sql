select 'one page_kind check, with the new kinds' as check_name,
  (select count(*) = 1 and bool_and(pg_get_constraintdef(oid) like '%apply_sent%') from pg_constraint
   where conrelid = 'public.analytics_events'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%page_kind%') as ok
union all select 'campaign column exists',
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analytics_events' and column_name = 'campaign')
union all select 'browser column exists',
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analytics_events' and column_name = 'browser')
union all select 'visitor index exists', to_regclass('public.analytics_events_visitor_idx') is not null
union all select 'site_vitals exists with RLS on',
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.site_vitals')), false)
union all select 'site_vitals has no policies', not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_vitals')
union all select 'public roles cannot touch site_vitals',
  not (has_table_privilege('anon', 'public.site_vitals', 'select, insert, update, delete') or has_table_privilege('authenticated', 'public.site_vitals', 'select, insert, update, delete'))
union all select 'public roles cannot touch analytics_events',
  not (has_table_privilege('anon', 'public.analytics_events', 'select, insert, update, delete') or has_table_privilege('authenticated', 'public.analytics_events', 'select, insert, update, delete'))
union all select 'public roles cannot run the functions',
  not (has_function_privilege('anon', 'public.analytics_summary(date,date,integer)', 'execute') or has_function_privilege('authenticated', 'public.analytics_summary(date,date,integer)', 'execute')
    or has_function_privilege('anon', 'public.analytics_purge(integer)', 'execute') or has_function_privilege('authenticated', 'public.analytics_purge(integer)', 'execute'))
union all select 'service_role can run the summary', has_function_privilege('service_role', 'public.analytics_summary(date,date,integer)', 'execute')
union all select 'summary returns the new sections',
  (select analytics_summary(current_date - 30, current_date, 2) ?& array['entries', 'campaigns', 'funnels', 'browsers', 'vitals', 'weekly'])
union all select 'page views kept (compare with step 1): ' || (select count(*) from public.analytics_events)::text, true;
