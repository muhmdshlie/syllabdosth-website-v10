# Analytics v2: your steps in Supabase

File to run: `supabase/migrations/20261023120000_analytics_v2.sql` (on the `analytics-v2` branch).
Where: Supabase dashboard → your project → **SQL Editor** → **New query**.

The website works the same before and after this migration, so you can run it before the new code is deployed.
Every step is marked **READ-ONLY** (only looks) or **CHANGES DATA** (changes the database).

---

## What the migration does, statement by statement

| Statement | What it does in plain English |
|---|---|
| `alter table analytics_events drop constraint if exists analytics_events_page_kind_check` | Removes the rule that limits `page_kind` to 5 values. Nothing else is removed. |
| `alter table analytics_events add constraint analytics_events_page_kind_check check (...)` | Puts the same rule back with 11 values (the 5 old ones plus service, booking_sent, group, group_sent, apply, apply_sent). Postgres checks every existing row against it; all existing rows already pass. |
| `alter table analytics_events add column if not exists campaign` | New empty column for the campaign name from `utm_campaign` links (max 60 characters). Existing rows get no value. |
| `alter table analytics_events add column if not exists browser` | New empty column for the browser family only (`chrome`, `safari`, `edge`, `firefox`, `samsung`, `opera`, `in_app`, `other`). The full user agent is never stored. Existing rows get no value. |
| `create index if not exists analytics_events_visitor_idx` | Speeds up working out visits. Changes no data. |
| `create table if not exists site_vitals` | New table for page speed and error counts: date, page address, measurement name, number and device type. No visitor ID, IP address, account or error message. |
| `create index if not exists site_vitals_day_idx / site_vitals_created_idx` | Speed up the dashboard and the clean-up. |
| `alter table site_vitals enable row level security` | Turns on row security with no policies, so nobody using the public API can read or write rows. |
| `revoke all on table site_vitals from anon, authenticated` | Removes the default access Supabase gives the public API roles on new tables. |
| `grant all on table site_vitals to service_role` | Lets the website's server (only it has the service-role key) store and read rows. |
| `create or replace function analytics_summary(...)` | Replaces the dashboard's summary function. Same name, inputs and permissions; returns the old figures unchanged plus visits, trends, entry pages, campaigns, services, browsers, funnels and site health. It only reads. |
| `create or replace function analytics_purge(...)` | Replaces the clean-up function. It deletes rows **older than 395 days (about 13 months)** from `analytics_events` **and now also `site_vitals`**, never fewer than 30 days. The website's server calls it at most once a day. |
| `revoke ... on function ... from public, anon, authenticated` / `grant execute ... to service_role` | Only the website's server can run the two functions, as before. |

There is no `delete` or `update` in the migration itself. The only deleting is `analytics_purge()`, as above, when the server calls it.

**Safe to re-run?** Yes. Every statement uses `if exists` / `if not exists` / `create or replace`, so if the SQL Editor stops part-way, run the whole file again. This was rehearsed on a copy of the current schema (`test-harness/migration-rehearsal.js`, 55 checks).

**Locking:** the constraint step briefly locks `analytics_events` while it re-checks existing rows (milliseconds at your size). A page-view beacon arriving at that moment simply waits.

---

## Step 1 — READ-ONLY: check the starting point

```sql
select
  (select count(*) from public.analytics_events) as page_views_now,
  (select string_agg(conname, ', ') from pg_constraint
    where conrelid = 'public.analytics_events'::regclass and contype = 'c') as check_rules;
```

Write down `page_views_now`. `check_rules` must include `analytics_events_page_kind_check` (you confirmed this already).

## Step 2 — READ-ONLY: backup copy of the analytics table

1. Supabase dashboard → **Table Editor** → click `analytics_events` in the table list.
2. Open the table's menu (the **⋯** next to its name in the list, or the **Export** button above the rows, depending on your Supabase version) → **Export table as CSV** (may be called *Export data → CSV*), and keep the file.

This only downloads. (The migration doesn't change existing rows, but this is your copy if you ever need it.)

## Step 3 — CHANGES DATA: run the migration

1. Open `supabase/migrations/20261023120000_analytics_v2.sql` (on the `analytics-v2` branch) and copy **all** of it.
2. SQL Editor → **New query** → paste → **Run**.
3. If Supabase warns about a *destructive operation*: that is the `drop constraint`, which is re-added on the next line. Confirm.
4. Expected: **Success. No rows returned.**

## Step 4 — READ-ONLY: check the result

```sql
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
```

Every row must show `ok = true`. The last row's number must be at least `page_views_now` from step 1.
Then tell Claude it has run: Claude will do read-only checks through the website's server connection (no writes).

---

## Rollback — CHANGES DATA (only if you need to undo it)

Keeps every page view. Run **A** first, then **B**.

**A.** Copy all of `supabase/migrations/20261022130000_site_analytics.sql` into a new query and **Run** (puts back the previous dashboard and clean-up functions; it is safe to re-run).

**B.** Then run:

```sql
drop table if exists public.site_vitals;
drop index if exists public.analytics_events_visitor_idx;
alter table public.analytics_events drop column if exists campaign;
alter table public.analytics_events drop column if exists browser;
update public.analytics_events set page_kind = 'page' where page_kind not in ('page', 'course', 'enroll', 'enroll_sent', 'search');
alter table public.analytics_events drop constraint if exists analytics_events_page_kind_check;
alter table public.analytics_events add constraint analytics_events_page_kind_check
  check (page_kind in ('page', 'course', 'enroll', 'enroll_sent', 'search'));
```

What B loses: all page-speed and error measurements, the campaign and browser of each page view, and which special page kind a row had (it becomes a plain `page`; the page address is kept). The website keeps working: the code falls back to the old shape automatically.
