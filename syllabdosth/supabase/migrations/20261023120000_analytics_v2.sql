-- ============================================================================
-- Website analytics v2 (Admin → Reports → Website Analytics).
-- Run after 20261022130000_site_analytics.sql. Safe to re-run. Additive only:
-- no existing row is changed or deleted, and no existing column is removed.
--
--   * analytics_events: six more page kinds (service, booking_sent, group,
--     group_sent, apply, apply_sent), a campaign column (cleaned utm_campaign)
--     and an index for working out visits.
--   * site_vitals: new table for page-speed measurements (Core Web Vitals) and
--     error counts. Path, metric, number and device type only: no visitor id,
--     IP address, user agent, account or error message.
--   * analytics_summary(): same name, arguments and permissions; returns the
--     old keys unchanged plus visits (sessions), weekly/monthly trends, landing
--     pages, campaigns, services, more funnels and site health.
--   * analytics_purge(): also deletes site_vitals rows older than the limit.
--
-- Permissions: as before, RLS on with NO policies and no grants to anon /
-- authenticated, so the public API can neither read nor write either table.
-- Only the service role (server code, after the consent and admin checks) can.
--
-- Rollback (restores v1 behaviour; the v1 function bodies are in
-- 20261022130000_site_analytics.sql, re-run that file after these lines):
--   drop table if exists public.site_vitals;
--   drop index if exists public.analytics_events_visitor_idx;
--   alter table public.analytics_events drop column if exists campaign;
--   delete from public.analytics_events where page_kind not in ('page', 'course', 'enroll', 'enroll_sent', 'search');
--   alter table public.analytics_events drop constraint if exists analytics_events_page_kind_check;
--   alter table public.analytics_events add constraint analytics_events_page_kind_check
--     check (page_kind in ('page', 'course', 'enroll', 'enroll_sent', 'search'));
-- ============================================================================

-- 1. More page kinds. The old check was created inline, so Postgres named it analytics_events_page_kind_check.
alter table public.analytics_events drop constraint if exists analytics_events_page_kind_check;
alter table public.analytics_events add constraint analytics_events_page_kind_check check (page_kind in (
  'page', 'course', 'enroll', 'enroll_sent', 'search',
  'service', 'booking_sent', 'group', 'group_sent', 'apply', 'apply_sent'));

-- 2. Campaign name from utm_campaign (lower-case letters, digits, . _ - only; cleaned by the server).
alter table public.analytics_events add column if not exists campaign text check (char_length(campaign) <= 60);

-- 3. Visits are worked out per visitor in time order.
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor_id, created_at);

-- 4. Page speed and errors.
create table if not exists public.site_vitals (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  day         date not null default (now() at time zone 'Asia/Kolkata')::date,  -- India-time day
  path        text not null check (char_length(path) between 1 and 200),   -- cleaned like analytics_events.path
  metric      text not null check (metric in ('LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'error')),
  value       double precision not null default 0 check (value >= 0 and value <= 600000),  -- ms; CLS is a score; 0 for errors
  device      text not null check (device in ('mobile', 'tablet', 'desktop'))
);

create index if not exists site_vitals_day_idx on public.site_vitals (day, metric);
create index if not exists site_vitals_created_idx on public.site_vitals (created_at);

alter table public.site_vitals enable row level security;
revoke all on table public.site_vitals from anon, authenticated;
grant all on table public.site_vitals to service_role;

-- 5. Aggregated numbers for the admin dashboard. Mirrors summarize() in lib/analytics.ts (demo mode).
create or replace function public.analytics_summary(p_from date, p_to date, p_min_term integer default 2)
returns jsonb
language sql
stable
set search_path = public
as $$
  with e as (
    select * from public.analytics_events where day between p_from and p_to
  ),
  -- A visit starts after 30 minutes without a page view, or on an arrival from another site or a campaign link.
  -- A direct load within 30 minutes (a reload, or the address typed again) stays in the same visit.
  marked as (
    select e.*,
           case when lag(e.created_at) over w is null or e.created_at - lag(e.created_at) over w > interval '30 minutes'
                  or (e.landing and coalesce(e.source, 'direct') <> 'direct')
                then 1 else 0 end as starts
    from e
    window w as (partition by e.visitor_id order by e.created_at, e.id)
  ),
  numbered as (
    select m.*, sum(m.starts) over (partition by m.visitor_id order by m.created_at, m.id rows unbounded preceding) as visit_no
    from marked m
  ),
  v as (
    select visitor_id, visit_no,
           (array_agg(day order by created_at, id))[1]     as day,
           (array_agg(path order by created_at, id))[1]    as entry,
           (array_agg(landing order by created_at, id))[1] as arrived,
           (array_agg(coalesce(source, 'direct') order by created_at, id))[1] as source,
           (array_agg(coalesce(medium, 'direct') order by created_at, id))[1] as medium,
           (array_agg(campaign order by created_at, id))[1] as campaign,
           count(*) as views,
           bool_or(page_kind in ('enroll_sent', 'booking_sent', 'group_sent', 'apply_sent')) as converted
    from numbered
    group by visitor_id, visit_no
  ),
  h as (
    select * from public.site_vitals where day between p_from and p_to
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'views', (select count(*) from e),
        'visitors', (select count(distinct visitor_id) from e),
        'returning', (select count(distinct visitor_id) from e where is_returning),
        'visits', (select count(*) from e where landing),
        'courseViews', (select count(*) from e where page_kind = 'course'),
        'searches', (select count(*) from e where page_kind = 'search'),
        'sessions', count(*),
        'singlePage', count(*) filter (where views = 1),
        'converted', count(*) filter (where converted))
      from v),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.views, 'visitors', d.visitors, 'returning', d.returning, 'sessions', coalesce(s.sessions, 0)) order by d.day)
      from (select day, count(*) as views, count(distinct visitor_id) as visitors, count(distinct visitor_id) filter (where is_returning) as returning
            from e group by day) d
      left join (select day, count(*) as sessions from v group by day) s on s.day = d.day), '[]'::jsonb),
    'weekly', coalesce((
      select jsonb_agg(jsonb_build_object('start', start, 'views', views, 'visitors', visitors) order by start)
      from (select date_trunc('week', day)::date as start, count(*) as views, count(distinct visitor_id) as visitors from e group by 1) d), '[]'::jsonb),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object('start', start, 'views', views, 'visitors', visitors) order by start)
      from (select date_trunc('month', day)::date as start, count(*) as views, count(distinct visitor_id) as visitors from e group by 1) d), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) order by views desc, path)
      from (select path, count(*) as views, count(distinct visitor_id) as visitors
            from e group by path order by views desc, path limit 15) d), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object('slug', course_slug, 'views', views, 'starts', starts, 'sent', sent) order by views desc, course_slug)
      from (select course_slug,
                   count(*) filter (where page_kind = 'course') as views,
                   count(*) filter (where page_kind = 'enroll') as starts,
                   count(*) filter (where page_kind = 'enroll_sent') as sent
            from e where course_slug is not null
            group by course_slug order by views desc, course_slug limit 15) d), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'views', views, 'visitors', visitors) order by views desc, path)
      from (select path, count(*) as views, count(distinct visitor_id) as visitors
            from e where page_kind = 'service' group by path order by views desc, path limit 15) d), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('path', entry, 'visits', visits, 'singlePage', single, 'converted', conv) order by visits desc, entry)
      from (select entry, count(*) as visits, count(*) filter (where views = 1) as single, count(*) filter (where converted) as conv
            from v group by entry order by visits desc, entry limit 15) d), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'medium', medium, 'visits', visits, 'converted', conv) order by visits desc, source)
      from (select source, medium, count(*) as visits, count(*) filter (where converted) as conv
            from v where arrived
            group by 1, 2 order by visits desc, source limit 12) d), '[]'::jsonb),
    'campaigns', coalesce((
      select jsonb_agg(jsonb_build_object('campaign', campaign, 'source', source, 'medium', medium, 'visits', visits, 'converted', conv) order by visits desc, campaign)
      from (select campaign, source, medium, count(*) as visits, count(*) filter (where converted) as conv
            from v where arrived and campaign is not null
            group by 1, 2, 3 order by visits desc, campaign limit 15) d), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'visitors', visitors, 'views', views) order by visitors desc, device)
      from (select device, count(distinct visitor_id) as visitors, count(*) as views from e group by device) d), '[]'::jsonb),
    -- Only words searched at least p_min_term times, so a one-off entry can't identify anyone.
    'searches', coalesce((
      select jsonb_agg(jsonb_build_object('term', search_term, 'count', n, 'zero', zero) order by n desc, search_term)
      from (select search_term, count(*) as n, count(*) filter (where search_results = 0) as zero
            from e where page_kind = 'search' and search_term is not null
            group by search_term having count(*) >= greatest(p_min_term, 2)
            order by n desc, search_term limit 20) d), '[]'::jsonb),
    'funnel', (
      select jsonb_build_object(
        'viewed', count(distinct visitor_id) filter (where page_kind = 'course'),
        'started', count(distinct visitor_id) filter (where page_kind = 'enroll'),
        'sent', count(distinct visitor_id) filter (where page_kind = 'enroll_sent'))
      from e),
    'funnels', (
      select jsonb_build_object(
        'serviceViewed', count(distinct visitor_id) filter (where page_kind = 'service'),
        'bookingSent', count(distinct visitor_id) filter (where page_kind = 'booking_sent'),
        'groupOpened', count(distinct visitor_id) filter (where page_kind = 'group'),
        'groupSent', count(distinct visitor_id) filter (where page_kind = 'group_sent'),
        'applyOpened', count(distinct visitor_id) filter (where page_kind = 'apply'),
        'applySent', count(distinct visitor_id) filter (where page_kind = 'apply_sent'))
      from e),
    'vitals', coalesce((
      select jsonb_agg(jsonb_build_object('metric', metric, 'samples', n, 'p75', p75, 'good', good, 'poor', poor) order by metric)
      from (select metric, count(*) as n,
                   percentile_cont(0.75) within group (order by value) as p75,
                   count(*) filter (where value <= case metric when 'LCP' then 2500 when 'INP' then 200 when 'CLS' then 0.1 when 'FCP' then 1800 else 800 end) as good,
                   count(*) filter (where value >  case metric when 'LCP' then 4000 when 'INP' then 500 when 'CLS' then 0.25 when 'FCP' then 3000 else 1800 end) as poor
            from h where metric <> 'error' group by metric) d), '[]'::jsonb),
    'slowPages', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'samples', n, 'p75', p75) order by p75 desc, path)
      from (select path, count(*) as n, percentile_cont(0.75) within group (order by value) as p75
            from h where metric = 'LCP' group by path having count(*) >= 3
            order by p75 desc, path limit 10) d), '[]'::jsonb),
    'errors', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'count', n) order by n desc, path)
      from (select path, count(*) as n from h where metric = 'error' group by path order by n desc, path limit 10) d), '[]'::jsonb)
  );
$$;

-- 6. Deletes raw rows older than p_keep_days (never less than 30) from both tables. Called at most once a day.
create or replace function public.analytics_purge(p_keep_days integer default 395)
returns integer
language sql
volatile
set search_path = public
as $$
  with gone as (
    delete from public.analytics_events
    where created_at < now() - make_interval(days => greatest(p_keep_days, 30))
    returning 1
  ), gone_vitals as (
    delete from public.site_vitals
    where created_at < now() - make_interval(days => greatest(p_keep_days, 30))
    returning 1
  )
  select ((select count(*) from gone) + (select count(*) from gone_vitals))::integer;
$$;

-- 7. Same permissions as before: only the service role may call these.
revoke all on function public.analytics_summary(date, date, integer) from public, anon, authenticated;
revoke all on function public.analytics_purge(integer) from public, anon, authenticated;
grant execute on function public.analytics_summary(date, date, integer) to service_role;
grant execute on function public.analytics_purge(integer) to service_role;
