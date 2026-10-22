-- ============================================================================
-- First-party website analytics (Admin → Reports → Website Analytics).
-- Run after 0003_admin_panel.sql. Safe to re-run. Creates a new table and two
-- functions only: no existing table or data is changed.
--
-- Rows are written only for visitors who accepted analytics cookies, by the
-- server (service role) from /api/collect. Privacy by design:
--   * visitor_id is a random ID from the visitor's browser, never the account id
--   * no IP address, user agent, name, email, phone or form contents
--   * paths are stored without query strings; private areas are never recorded
--   * rows older than ~13 months are deleted by analytics_purge()
--
-- Permissions: RLS is on with NO policies, and anon / authenticated have no
-- grants, so the public API can neither read nor write this table. Only the
-- service role (server code, after an admin check) can use it.
--
-- Rollback:
--   drop function if exists public.analytics_summary(date, date, integer);
--   drop function if exists public.analytics_purge(integer);
--   drop table if exists public.analytics_events;
-- ============================================================================

create table if not exists public.analytics_events (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  day            date not null default (now() at time zone 'Asia/Kolkata')::date,  -- India-time day
  visitor_id     uuid not null,
  is_returning   boolean not null default false,       -- first seen on an earlier day
  path           text not null check (char_length(path) between 1 and 200),
  page_kind      text not null default 'page' check (page_kind in ('page', 'course', 'enroll', 'enroll_sent', 'search')),
  course_slug    text check (char_length(course_slug) <= 120),
  search_term    text check (char_length(search_term) <= 60),
  search_results integer check (search_results >= 0),
  landing        boolean not null default false,       -- first page of a visit from outside the site
  source         text check (char_length(source) <= 80),
  medium         text check (medium in ('direct', 'search', 'social', 'referral', 'campaign', 'email')),
  device         text not null check (device in ('mobile', 'tablet', 'desktop'))
);

create index if not exists analytics_events_day_idx on public.analytics_events (day, page_kind);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at);

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from anon, authenticated;

-- Aggregated numbers for the admin dashboard. Mirrors summarize() in lib/analytics.ts (demo mode).
create or replace function public.analytics_summary(p_from date, p_to date, p_min_term integer default 2)
returns jsonb
language sql
stable
set search_path = public
as $$
  with e as (
    select * from public.analytics_events where day between p_from and p_to
  )
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'views', count(*),
        'visitors', count(distinct visitor_id),
        'returning', count(distinct visitor_id) filter (where is_returning),
        'visits', count(*) filter (where landing),
        'courseViews', count(*) filter (where page_kind = 'course'),
        'searches', count(*) filter (where page_kind = 'search'))
      from e),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'visitors', visitors) order by day)
      from (select day, count(*) as views, count(distinct visitor_id) as visitors from e group by day) d), '[]'::jsonb),
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
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'medium', medium, 'visits', visits) order by visits desc, source)
      from (select coalesce(source, 'direct') as source, coalesce(medium, 'direct') as medium, count(*) as visits
            from e where landing
            group by 1, 2 order by visits desc, source limit 12) d), '[]'::jsonb),
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
      from e)
  );
$$;

-- Deletes raw events older than p_keep_days (never less than 30). Called by the dashboard at most once a day.
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
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.analytics_summary(date, date, integer) from public, anon, authenticated;
revoke all on function public.analytics_purge(integer) from public, anon, authenticated;
grant execute on function public.analytics_summary(date, date, integer) to service_role;
grant execute on function public.analytics_purge(integer) to service_role;
grant all on table public.analytics_events to service_role;
