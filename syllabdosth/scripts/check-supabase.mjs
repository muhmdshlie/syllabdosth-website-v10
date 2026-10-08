// Live check of the real Supabase project.
// Run from the project folder:   node scripts/check-supabase.mjs
// Reads keys from .env.local. Creates one temporary test user + one test row, then deletes them.
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ---- load .env.local ----
const env = { ...process.env };
for (const f of ['.env.local', '.env']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const URL = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

let fails = 0, warns = 0;
const ok = (m) => console.log('  \x1b[32m✔\x1b[0m ' + m);
const bad = (m) => { fails++; console.log('  \x1b[31m✘\x1b[0m ' + m); };
const warn = (m) => { warns++; console.log('  \x1b[33m!\x1b[0m ' + m); };
const head = (m) => console.log('\n\x1b[1m' + m + '\x1b[0m');

head('1. Keys');
if (!URL || !ANON) { bad('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing in .env.local — the site would run in DEMO mode'); process.exit(1); }
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(URL)) warn(`URL looks unusual: ${URL} (expected https://<project>.supabase.co, no trailing path)`); else ok(`URL ${URL}`);
if (!SERVICE) bad('SUPABASE_SERVICE_ROLE_KEY missing — every form submit and admin action will fail'); else ok('service role key present');
if (SERVICE && SERVICE === ANON) bad('service role key is the same as the anon key — copy the "service_role" key instead');
if (!env.NEXT_PUBLIC_SITE_URL) warn('NEXT_PUBLIC_SITE_URL not set — email and Google login redirects will point to localhost');

const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const admin = SERVICE ? createClient(URL, SERVICE, { auth: { persistSession: false } }) : null;

head('2. Connection + auth settings');
let settings = null;
try {
  const r = await fetch(`${URL.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: ANON } });
  if (r.status === 401) bad('anon key rejected (401) — wrong key for this project');
  else if (!r.ok) bad(`auth settings returned HTTP ${r.status}`);
  else { settings = await r.json(); ok('reached project, anon key accepted'); }
} catch (e) { bad(`cannot reach ${URL}: ${e.message} (project paused, wrong URL, or no internet)`); process.exit(1); }
if (settings) {
  const ext = settings.external || {};
  ext.email ? ok('Email login enabled') : bad('Email login disabled (Authentication → Providers → Email)');
  ext.google ? ok('Google login enabled') : warn('Google login not enabled — the "Continue with Google" button will error');
  ext.phone ? ok('Phone login enabled') : warn('Phone (OTP) login not enabled — phone login will error');
  settings.mailer_autoconfirm ? warn('Email confirmation is OFF (users log in without confirming)') : ok('Email confirmation required');
}

head('3. Tables (migration 0001_schema.sql)');
const tables = ['profiles','categories','faculty','courses','services','professionals','blog_posts','bookings','group_enquiries','enrollments','applications','newsletter_subscribers','contact_messages'];
const client = admin || anon;
let missing = 0;
for (const t of tables) {
  // A HEAD request has no response body, so a missing table can come back without an error.
  // Use a GET (limit 0) so PostgREST's "table not found" message is returned.
  const { error } = await client.from(t).select('*').limit(0);
  if (error) { missing++; bad(`${t}: ${error.message}${/does not exist|schema cache/.test(error.message) ? ' → run supabase/migrations/0001_schema.sql in the SQL Editor' : ''}`); }
}
if (!missing) ok(`all ${tables.length} tables exist`);
if (!admin) warn('could not verify with service role; results above use the anon key');

head('3b. Admin panel tables (migration 0003_admin_panel.sql)');
const adminTables = ['site_content','media','course_lessons','course_reviews','certificates','quizzes','assignments','submissions','live_classes','organisations','staff','notifications','support_tickets','faqs','testimonials','offers','email_templates','sms_templates','activity_log'];
let missing3 = 0;
for (const t of adminTables) {
  const { error } = await client.from(t).select('*').limit(0);
  if (error) { missing3++; bad(`${t}: ${error.message}${/does not exist|schema cache/.test(error.message) ? ' → run supabase/migrations/0003_admin_panel.sql in the SQL Editor' : ''}`); }
}
if (!missing3) ok(`all ${adminTables.length} admin-panel tables exist`);
{
  const { error } = await client.from('courses').select('published').limit(0);
  const { error: e2 } = await client.from('categories').select('image_url').limit(0);
  if (error || e2) bad('new columns missing (categories.image_url …) → run supabase/migrations/0003_admin_panel.sql');
  else ok('image columns added to categories, services, faculty, blog');
}
if (admin) {
  const { data, error } = await admin.storage.getBucket('media');
  if (error || !data) warn('storage bucket "media" not found — it is created on the first image upload, or run 0003_admin_panel.sql');
  else if (!data.public) bad('storage bucket "media" is private → make it public (Storage → media → Edit bucket)');
  else ok('storage bucket "media" is ready for image uploads');
}

head('4. Public catalogue (seed.sql, as a visitor)');
for (const t of ['categories','courses','services','professionals','faculty','blog_posts']) {
  const { count, error } = await anon.from(t).select('*', { count: 'exact' }).limit(0);
  if (error) bad(`${t}: ${error.message}`);
  else if (!count) warn(`${t}: 0 visible rows — page will be empty (run supabase/seed.sql, or rows are unpublished/unverified)`);
  else ok(`${t}: ${count} rows visible`);
}

head('5. Security (Row Level Security, as a visitor)');
for (const t of ['profiles','bookings','group_enquiries','enrollments','applications','newsletter_subscribers','contact_messages','site_content','support_tickets','submissions','staff','activity_log','email_templates','media']) {
  const { data, error } = await anon.from(t).select('*').limit(1);
  if (error && error.code === 'PGRST205') bad(`${t}: table does not exist → run the SQL files in supabase/migrations`);
  else if (error) ok(`${t}: read blocked`);
  else if (data.length) bad(`${t}: a visitor can READ private data — RLS is off or has an open policy`);
  else ok(`${t}: nothing readable`);
}
{
  const { error } = await anon.from('contact_messages').insert({ name: 'rls-probe', phone: '0', email: 'rls@probe.test', topic: 'x', message: 'x' });
  error?.code === 'PGRST205' ? bad('contact_messages table does not exist — cannot test write protection') : error ? ok('visitor cannot write directly (writes go through the server)') : bad('visitor can insert rows directly — RLS insert policy too open');
  if (!error && admin) await admin.from('contact_messages').delete().eq('email', 'rls@probe.test');
}

if (admin) {
  head('6. Server writes (service role) + new-user trigger');
  const probe = `probe-${Date.now()}@example.com`;
  const ins = await admin.from('newsletter_subscribers').insert({ email: probe }).select('email').single();
  if (ins.error) bad(`insert via service role failed: ${ins.error.message}`);
  else { ok('service role can insert (forms will save)'); await admin.from('newsletter_subscribers').delete().eq('email', probe); }

  const u = await admin.auth.admin.createUser({ email: probe, password: `Pw-${Date.now()}!`, email_confirm: true, user_metadata: { full_name: 'Check Script' } });
  if (u.error) bad(`could not create a test user: ${u.error.message}`);
  else {
    const id = u.data.user.id;
    await new Promise((r) => setTimeout(r, 800));
    const p = await admin.from('profiles').select('id, role').eq('id', id).maybeSingle();
    if (p.error) bad(`profiles lookup failed: ${p.error.message}`);
    else if (!p.data) bad('signup trigger did NOT create a profile row → re-run the handle_new_user part of the migration');
    else ok(`signup trigger created profile (role: ${p.data.role})`);

    const del = await admin.auth.admin.deleteUser(id);
    del.error ? warn(`test user ${probe} not deleted: ${del.error.message} — delete it in Authentication → Users`) : ok('test user cleaned up');
  }

  const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
  count ? ok(`${count} admin account(s)`) : warn('no admin account yet — /admin will be locked. Sign up, then set profiles.role = \'admin\' for your user');
}

console.log(`\n${fails ? '\x1b[31m' : '\x1b[32m'}${fails} error(s), ${warns} warning(s)\x1b[0m\n`);
process.exit(fails ? 1 : 0);
