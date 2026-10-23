// Rehearses the analytics v2 migration on PGlite (Postgres in WASM), never on production:
// v1 schema + rows -> v2 twice -> data, permissions, SQL = TypeScript, purge, rollback.
// Run from syllabdosth/:  npm i --no-save @electric-sql/pglite@0.2.17 && node test-harness/migration-rehearsal.js
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const REPO = path.join(__dirname, '..');
const V1 = fs.readFileSync(`${REPO}/supabase/migrations/20261022130000_site_analytics.sql`, 'utf8');
const V2 = fs.readFileSync(`${REPO}/supabase/migrations/20261023120000_analytics_v2.sql`, 'utf8');

// Load lib/analytics.ts summarize() (demo-mode mirror) the same way analytics-unit.js does.
const Module = require('module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { return req === 'server-only' ? __filename : resolve.call(this, req, ...rest); };
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) process.env[k] = '';
if (require.main !== module) return;
const jiti = require(path.join(REPO, 'node_modules/jiti'))(path.join(REPO, 'lib/x.js'), { interopDefault: true });
const A = jiti(path.join(REPO, 'lib/analytics.ts'));

let fails = 0;
const ck = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`); if (!ok) fails++; };
// jsonb stores keys sorted; compare values, not key order.
const norm = (x) => JSON.parse(JSON.stringify(x, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v)));

(async () => {
  const db = new PGlite();
  const q = async (sql, p) => (await db.query(sql, p)).rows;
  // Supabase's roles and its default grants on new tables and functions (so the revokes are really tested).
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;`);

  // 1. Production today: v1 schema with existing rows.
  await db.exec(V1);
  const ins = `insert into analytics_events (created_at, day, visitor_id, is_returning, path, page_kind, course_slug, search_term, search_results, landing, source, medium, device)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
  const vid = (n) => `00000000-0000-4000-8000-00000000000${n}`;
  const t = (min) => new Date(Date.parse('2026-10-20T04:00:00Z') + min * 60_000).toISOString();
  const old = [
    [t(0), '2026-10-20', vid(1), false, '/', 'page', null, null, null, true, 'instagram', 'campaign', 'mobile'],
    [t(2), '2026-10-20', vid(1), false, '/courses/tailoring', 'course', 'tailoring', null, null, false, null, null, 'mobile'],
    [t(4), '2026-10-20', vid(1), false, '/courses/tailoring/enroll', 'enroll', 'tailoring', null, null, false, null, null, 'mobile'],
    [t(6), '2026-10-20', vid(1), false, '/courses/tailoring/enroll/sent', 'enroll_sent', 'tailoring', null, null, false, null, null, 'mobile'],
    [t(7), '2026-10-20', vid(2), false, '/courses', 'search', null, 'saree', 3, true, 'google.com', 'search', 'desktop'],
    [t(8), '2026-10-20', vid(3), false, '/courses', 'search', null, 'saree', 0, true, 'direct', 'direct', 'tablet'],
  ];
  for (const r of old) await q(ins, r);
  const before = await q(`select * from analytics_events order by id`);
  const v1Summary = (await q(`select analytics_summary('2026-10-01', '2026-10-31', 2) as s`))[0].s;
  const v1Check = (await q(`select pg_get_constraintdef(oid) d from pg_constraint where conname = 'analytics_events_page_kind_check'`))[0].d;
  console.log('v1 constraint:', v1Check);

  // 2. Run v2 twice: it must be safe to re-run.
  await db.exec(V2);
  await db.exec(V2);
  ck('Migration runs, and runs again without error', true);

  const checks = await q(`select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid = 'public.analytics_events'::regclass and contype = 'c' and conname like '%page_kind%'`);
  ck('Exactly one page_kind check after two runs', checks.length === 1, checks);
  ck('New check allows the 11 kinds', ['page', 'course', 'enroll', 'enroll_sent', 'search', 'service', 'booking_sent', 'group', 'group_sent', 'apply', 'apply_sent'].every((k) => checks[0].d.includes(`'${k}'`)), checks[0].d);
  const after = await q(`select id, created_at, day, visitor_id, is_returning, path, page_kind, course_slug, search_term, search_results, landing, source, medium, device from analytics_events order by id`);
  ck('Existing rows unchanged', JSON.stringify(after) === JSON.stringify(before), '');
  ck('Existing rows have browser = null', (await q(`select count(*)::int n from analytics_events where browser is not null`))[0].n === 0);
  ck('Existing rows get campaign = null', (await q(`select count(*)::int n from analytics_events where campaign is not null`))[0].n === 0);
  const v2Old = (await q(`select analytics_summary('2026-10-01', '2026-10-31', 2) as s`))[0].s;
  const sameOldKeys = ['totals', 'daily', 'pages', 'courses', 'devices', 'searches', 'funnel'].every((k) => {
    if (k === 'totals') return Object.entries(v1Summary.totals).every(([kk, v]) => v2Old.totals[kk] === v);
    if (k === 'daily') return v1Summary.daily.every((d, i) => d.day === v2Old.daily[i].day && d.views === v2Old.daily[i].views && d.visitors === v2Old.daily[i].visitors);
    return JSON.stringify(v1Summary[k]) === JSON.stringify(v2Old[k]);
  });
  ck('Old dashboard numbers identical after the migration', sameOldKeys, { v1: v1Summary, v2: v2Old });
  ck('Old sources keys kept (visits)', v2Old.sources.every((s) => 'visits' in s && 'source' in s && 'medium' in s));
  ck('Still rejects an unknown page kind', await db.query(ins, [t(9), '2026-10-20', vid(4), false, '/', 'bogus', null, null, null, false, null, null, 'mobile']).then(() => false, () => true));

  // 3. New rows: the code's v2 inserts work; v1 fallback shape also still works.
  const ins2 = `insert into analytics_events (created_at, day, visitor_id, is_returning, path, page_kind, course_slug, search_term, search_results, landing, source, medium, device, campaign, browser)
                values ($1, $2, $3, false, $4, $5, null, null, null, $6, $7, $8, $9, $10, $11)`;
  const add = [
    [t(51), '2026-10-20', vid(1), '/courses', 'page', false, null, null, 'mobile', null],
    [t(60), '2026-11-02', vid(5), '/services/makeup', 'service', true, 'google.com', 'search', 'desktop', null],
    [t(70), '2026-10-21', vid(6), '/services/makeup', 'service', true, 'insta', 'campaign', 'mobile', 'diwali'],
    [t(73), '2026-10-21', vid(6), '/bookings/[id]/sent', 'booking_sent', false, null, null, 'mobile', null],
    [t(80), '2026-10-21', vid(7), '/', 'page', true, 'direct', 'direct', 'mobile', null],
    [t(85), '2026-10-21', vid(7), '/', 'page', true, 'direct', 'direct', 'mobile', null], // a reload: same visit
    [t(90), '2026-10-22', vid(8), '/group-booking', 'group', true, 'direct', 'direct', 'mobile', null],
    [t(92), '2026-10-22', vid(8), '/group-booking/sent', 'group_sent', false, null, null, 'mobile', null],
    [t(95), '2026-10-22', vid(9), '/apply/faculty', 'apply', true, 'direct', 'direct', 'mobile', null],
  ];
  for (const [i, r] of add.entries()) await q(ins2, [...r, ['chrome', 'safari', 'in_app'][i % 3]]);
  ck('Campaign longer than 60 characters refused', await db.query(ins2, [t(99), '2026-10-22', vid(9), '/', 'page', false, null, null, 'mobile', 'x'.repeat(61), 'chrome']).then(() => false, () => true));
  ck('A full user agent is refused as a browser value', await db.query(ins2, [t(99), '2026-10-22', vid(9), '/', 'page', false, null, null, 'mobile', null, 'Mozilla/5.0 (Windows NT 10.0)']).then(() => false, () => true));
  const vins = `insert into site_vitals (created_at, day, path, metric, value, device) values ($1, $2, $3, $4, $5, $6)`;
  const vit = [[t(1), '2026-10-20', '/', 'LCP', 1000, 'mobile'], [t(2), '2026-10-20', '/', 'LCP', 2000, 'mobile'], [t(3), '2026-10-20', '/', 'LCP', 3000, 'mobile'],
    [t(4), '2026-10-20', '/', 'LCP', 5000, 'mobile'], [t(5), '2026-10-20', '/', 'CLS', 0.3, 'mobile'], [t(6), '2026-10-20', '/', 'INP', 150, 'desktop'],
    [t(7), '2026-10-20', '/courses', 'error', 0, 'mobile'], [t(8), '2026-12-01', '/', 'error', 0, 'mobile']];
  for (const r of vit) await q(vins, r);
  ck('site_vitals refuses an unknown metric', await db.query(vins, [t(9), '2026-10-20', '/', 'FID', 1, 'mobile']).then(() => false, () => true));
  ck('site_vitals refuses a negative value', await db.query(vins, [t(9), '2026-10-20', '/', 'LCP', -1, 'mobile']).then(() => false, () => true));

  // 4. SQL summary == TypeScript summarize() on the same rows.
  const rows = (await q(`select * from analytics_events order by id`)).map((r) => ({ ...r, id: String(r.id).padStart(6, '0'), created_at: new Date(r.created_at).toISOString(), day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : r.day }));
  const hv = (await q(`select * from site_vitals`)).map((r) => ({ ...r, day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : r.day }));
  const sql = (await q(`select analytics_summary('2026-10-01', '2026-11-30', 2) as s`))[0].s;
  const ts = A.summarize(rows, '2026-10-01', '2026-11-30', hv);
  for (const k of Object.keys(ts)) ck(`SQL = TypeScript: ${k}`, JSON.stringify(norm(sql[k])) === JSON.stringify(norm(ts[k])), { sql: sql[k], ts: ts[k] });
  ck('Browsers counted (3 families)', sql.browsers.length === 3 && sql.browsers.every((b) => b.views > 0), sql.browsers);
  ck('Reload within 30 minutes is one visit (SQL)', sql.entries.find((e) => e.path === '/').visits === 2); // vid1's first visit + vid7's one visit

  // 5. Permissions, as the public API roles.
  const priv = async (sql) => (await q(sql))[0].ok;
  ck('anon cannot read site_vitals', !(await priv(`select has_table_privilege('anon', 'public.site_vitals', 'select') ok`)));
  ck('anon cannot insert site_vitals', !(await priv(`select has_table_privilege('anon', 'public.site_vitals', 'insert') ok`)));
  ck('authenticated cannot read site_vitals', !(await priv(`select has_table_privilege('authenticated', 'public.site_vitals', 'select') ok`)));
  ck('anon still cannot read analytics_events', !(await priv(`select has_table_privilege('anon', 'public.analytics_events', 'select') ok`)));
  ck('service_role can insert site_vitals', await priv(`select has_table_privilege('service_role', 'public.site_vitals', 'insert') ok`));
  ck('anon cannot run analytics_summary', !(await priv(`select has_function_privilege('anon', 'public.analytics_summary(date,date,integer)', 'execute') ok`)));
  ck('authenticated cannot run analytics_purge', !(await priv(`select has_function_privilege('authenticated', 'public.analytics_purge(integer)', 'execute') ok`)));
  ck('service_role can run analytics_summary', await priv(`select has_function_privilege('service_role', 'public.analytics_summary(date,date,integer)', 'execute') ok`));
  ck('RLS on site_vitals, no policies', (await q(`select relrowsecurity ok from pg_class where oid = 'public.site_vitals'::regclass`))[0].ok && (await q(`select count(*)::int n from pg_policies where tablename = 'site_vitals'`))[0].n === 0);
  ck('Functions are not security definer', (await q(`select bool_or(prosecdef) b from pg_proc where proname in ('analytics_summary', 'analytics_purge')`))[0].b === false);
  await db.exec(`set role service_role`);
  ck('service_role can call the summary', !!(await q(`select analytics_summary('2026-10-01', '2026-10-31', 2) as s`))[0].s.totals);
  await db.exec(`reset role; set role anon`);
  ck('anon is refused when calling the summary', await db.query(`select analytics_summary('2026-10-01', '2026-10-31', 2)`).then(() => false, () => true));
  await db.exec(`reset role`);

  // 6. Purge: only rows older than the limit, in both tables.
  await q(`insert into analytics_events (created_at, day, visitor_id, path, device) values (now() - interval '500 days', '2025-06-01', $1, '/', 'mobile')`, [vid(9)]);
  await q(`insert into site_vitals (created_at, day, path, metric, value, device) values (now() - interval '500 days', '2025-06-01', '/', 'LCP', 1, 'mobile')`);
  const n0 = (await q(`select (select count(*) from analytics_events) + (select count(*) from site_vitals) n`))[0].n;
  const purged = (await q(`select analytics_purge(395) n`))[0].n;
  const n1 = (await q(`select (select count(*) from analytics_events) + (select count(*) from site_vitals) n`))[0].n;
  ck('Purge deletes exactly the 2 old rows', purged === 2 && Number(n0) - Number(n1) === 2, { purged, n0, n1 });

  // 7. Rollback, in the documented order (v1 file first, then the listed statements).
  const kept = (await q(`select count(*)::int n from analytics_events`))[0].n;
  await db.exec(V1);
  await db.exec(V2.split('-- Rollback')[1].split('-- ====')[0].split('\n').filter((l) => l.startsWith('--   ')).map((l) => l.slice(5)).join('\n'));
  ck('Rollback: site_vitals gone', (await q(`select to_regclass('public.site_vitals') r`))[0].r === null);
  ck('Rollback: campaign column gone', (await q(`select count(*)::int n from information_schema.columns where table_name = 'analytics_events' and column_name = 'campaign'`))[0].n === 0);
  const rbCheck = await q(`select pg_get_constraintdef(oid) d from pg_constraint where conrelid = 'public.analytics_events'::regclass and conname = 'analytics_events_page_kind_check'`);
  ck('Rollback: original check restored', rbCheck.length === 1 && rbCheck[0].d === v1Check, rbCheck);
  ck('Rollback: v1 summary works', !!(await q(`select analytics_summary('2026-10-01', '2026-11-30', 2) as s`))[0].s.totals);
  ck('Rollback: v1 purge works', (await q(`select analytics_purge(395) n`))[0].n === 0);
  const left = (await q(`select count(*)::int n from analytics_events`))[0].n;
  ck(`Rollback keeps every page view (${left} of ${kept})`, left === kept);
  ck('Rollback: browser column gone', (await q(`select count(*)::int n from information_schema.columns where table_name = 'analytics_events' and column_name = 'browser'`))[0].n === 0);
  ck('Rollback: new kinds became page', (await q(`select count(*)::int n from analytics_events where page_kind not in ('page', 'course', 'enroll', 'enroll_sent', 'search')`))[0].n === 0);
  ck('Rollback: original v1 rows all kept', (await q(`select count(*)::int n from analytics_events where id <= 6`))[0].n === 6);

  console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
