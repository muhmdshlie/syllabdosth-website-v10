// Security checks against a DEMO-mode build (no Supabase keys, so nothing touches a real database):
// admin pages refuse non-admins even on a crafted client-navigation request, the login "next" parameter
// can't redirect off-site, the security headers are sent, and the CSP lets Google Analytics and our own
// analytics run (Google's script is stubbed: nothing is sent to Google).
//   (demo build, see analytics-e2e.js) npx next start -p 3000
//   optional, to check demo logins are refused on Vercel: (same build) VERCEL=1 npx next start -p 3001
//   SITE=http://localhost:3000 SITE_VERCEL=http://localhost:3001 CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node test-harness/security.js
const path = require('path');
let pw;
try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const S = process.env.SITE || 'http://localhost:3000';
const GA_ID = 'G-P6WR6990K2';
let fails = 0;
const ck = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`); if (!ok) fails++; };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const BS = String.fromCharCode(92); // a backslash

// Every admin page. Segments after /admin/ need not exist: the role check runs before anything is loaded.
const ADMIN_PAGES = ['/admin', '/admin/students', '/admin/students/new', '/admin/students/demo-learner', '/admin/ai', '/admin/analytics',
  '/admin/cms', '/admin/cms/page.privacy', '/admin/login-methods', '/admin/media', '/admin/reports', '/admin/reports/enrollments',
  '/admin/settings', '/admin/settings/addons', '/admin/utility', '/admin/wallet', '/admin/wallet/ledger', '/admin/wallet/commissions',
  '/admin/wallet/franchises', '/admin/wallet/payouts'];
// What the browser sends on a client navigation from /admin: "the admin layout is already on screen".
const TREE = encodeURIComponent(JSON.stringify(['', { children: ['(admin)', { children: ['admin', { children: ['__PAGE__', {}] }] }] }, null, null, true]));
const EMAIL = /[a-z0-9._-]+@example\.com/;

const get = (u, cookie, extra = {}) => fetch(S + u, { redirect: 'manual', headers: { 'user-agent': UA, ...(cookie ? { cookie } : {}), ...extra } });

(async () => {
  // 1. Headers.
  for (const p of ['/', '/courses', '/legal/privacy', '/login']) {
    const r = await get(p);
    const csp = r.headers.get('content-security-policy') || '';
    ck(`${p}: CSP sent, with Google Analytics allowed`, /script-src [^;]*https:\/\/\*\.googletagmanager\.com/.test(csp) && /connect-src [^;]*'self'[^;]*https:\/\/\*\.google-analytics\.com[^;]*https:\/\/\*\.analytics\.google\.com/.test(csp), csp);
    ck(`${p}: no framing, nosniff, referrer and permissions policies`, /frame-ancestors 'none'/.test(csp) && r.headers.get('x-frame-options') === 'DENY'
      && r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('referrer-policy') === 'strict-origin-when-cross-origin'
      && /camera=\(\)/.test(r.headers.get('permissions-policy') || ''));
    ck(`${p}: HSTS with subdomains, no X-Powered-By`, /max-age=63072000; includeSubDomains/.test(r.headers.get('strict-transport-security') || '') && !r.headers.get('x-powered-by'));
  }

  // 2. Admin pages: a learner gets a redirect, never the page, even on a crafted client-navigation request.
  for (const p of ADMIN_PAGES) {
    const plain = await get(p, 'sd_demo_role=learner');
    ck(`${p}: learner page load is redirected`, plain.status === 307 && !plain.headers.get('location')?.includes('/admin'), `${plain.status} ${plain.headers.get('location')}`);
    const rsc = await get(p, 'sd_demo_role=learner', { RSC: '1', 'Next-Router-State-Tree': TREE });
    const body = await rsc.text();
    ck(`${p}: learner crafted RSC request is redirected, no data`, (body.includes('NEXT_REDIRECT') || rsc.status === 307) && !EMAIL.test(body), `${rsc.status} ${body.slice(0, 120)}`);
  }
  const anon = await get('/admin/students');
  ck('Anonymous visitor is sent to log in', anon.status === 307 && anon.headers.get('location')?.includes('/login'));
  const adm = await get('/admin/students', 'sd_demo_role=admin');
  ck('Admin still sees the students page', adm.status === 200 && EMAIL.test(await adm.text()));
  const admRsc = await get('/admin/students', 'sd_demo_role=admin', { RSC: '1', 'Next-Router-State-Tree': TREE });
  ck('Admin client navigation still works', admRsc.status === 200 && EMAIL.test(await admRsc.text()));

  // 3. Open redirect: the helper, then the real login redirect.
  const jiti = require('jiti')(__filename, { interopDefault: true });
  const { safePath } = jiti(path.join(__dirname, '..', 'lib', 'safe-path.ts'));
  const off = ['//evil.example', `/${BS}evil.example`, `/${BS}${BS}evil.example`, `/${BS}/evil.example`, '/\t/evil.example', '/\n/evil.example', 'https://evil.example', 'evil.example', '', null, 42];
  for (const v of off) ck(`safePath refuses ${JSON.stringify(v)}`, safePath(v) === '');
  for (const [v, want] of [['/dashboard', '/dashboard'], ['/courses/abc?x=1#top', '/courses/abc?x=1#top'], ['/admin/students?q=a%2Fb', '/admin/students?q=a%2Fb']]) ck(`safePath keeps ${v}`, safePath(v) === want, safePath(v));
  // A literal "%09" is not decoded by browsers in a Location header, so "/%09/evil.example" is a path on this site.
  for (const n of [`/${BS}evil.example`, '//evil.example', '/\t/evil.example', '/%09/evil.example']) {
    const r = await get(`/login?next=${encodeURIComponent(n)}`, 'sd_demo_role=learner');
    const loc = r.headers.get('location') || '';
    ck(`Logged-in /login?next=${JSON.stringify(n)} stays on the site`, r.status === 307 && new URL(loc, S).origin === new URL(S).origin, loc);
  }
  const ok = await get(`/login?next=${encodeURIComponent('/dashboard/support')}`, 'sd_demo_role=learner');
  ck('A safe next path still works', ok.headers.get('location')?.endsWith('/dashboard/support'), ok.headers.get('location'));

  // 4. An account's booking (bk-1001 belongs to the demo learner; its location is 'Jayanagar 4th Block') is shown only to that account or an admin.
  const bk = '/bookings/bk-1001';
  const bAnon = await get(bk);
  ck('Booking: logged-out visitor is sent to log in, no details', bAnon.status === 307 && bAnon.headers.get('location')?.includes('/login'), `${bAnon.status}`);
  for (const role of ['professional', 'faculty']) {
    const r = await get(bk, `sd_demo_role=${role}`);
    const body = await r.text();
    ck(`Booking: another account (${role}) gets not found, no details`, r.status === 404 && !body.includes('98450 12345') && !body.includes('Jayanagar 4th Block'), String(r.status));
  }
  for (const role of ['learner', 'admin']) {
    const r = await get(bk, `sd_demo_role=${role}`);
    ck(`Booking: ${role === 'learner' ? 'the owner' : 'an admin'} still sees it`, r.status === 200 && (await r.text()).includes('Jayanagar 4th Block'), String(r.status));
  }
  const sent = await get(`${bk}/sent`, 'sd_demo_role=professional');
  ck('Booking "sent" page: another account gets not found', sent.status === 404, String(sent.status));

  // 5. The image optimizer refuses images from other hosts.
  const img = await get(`/_next/image?url=${encodeURIComponent('https://example.supabase.co/storage/v1/object/public/x.png')}&w=64&q=75`);
  ck('/_next/image refuses a remote image', img.status === 400, String(img.status));

  // 6. With VERCEL set (SITE_VERCEL: a second demo server started with VERCEL=1), demo logins are refused.
  if (process.env.SITE_VERCEL) {
    const V = process.env.SITE_VERCEL;
    const r = await fetch(`${V}/admin`, { redirect: 'manual', headers: { 'user-agent': UA, cookie: 'sd_demo_role=admin' } });
    ck('On Vercel: an admin demo cookie gives no access', r.status === 307 && r.headers.get('location')?.includes('/login'), `${r.status} ${r.headers.get('location')}`);
    const login = await (await fetch(`${V}/login`, { headers: { 'user-agent': UA } })).text();
    ck('On Vercel: no demo login buttons', !login.includes('name="role"'));
  }

  // 7. In a browser: no CSP violations, and Google Analytics and our analytics still run after consent.
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const adminCtx = await browser.newContext({ userAgent: UA });
  const admin = await adminCtx.newPage();
  await adminCtx.route('https://www.googletagmanager.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await admin.goto(`${S}/login`);
  await Promise.all([admin.waitForURL((u) => !u.pathname.startsWith('/login')), admin.locator('form:has(input[name="role"][value="admin"]) button').first().click()]);
  await admin.goto(`${S}/admin/settings/addons`);
  await admin.locator('#f-analytics-enabled').setChecked(true, { force: true });
  await admin.fill('#f-analytics-id', GA_ID);
  await admin.getByRole('button', { name: 'Save changes' }).click();
  await admin.getByText('saved', { exact: false }).first().waitFor({ timeout: 10000 });
  const adminViolations = [];
  admin.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) adminViolations.push(m.text()); });
  for (const p of ['/admin', '/admin/students', '/admin/media', '/admin/analytics']) await admin.goto(`${S}${p}`);
  ck('Admin pages: no CSP violations', adminViolations.length === 0, adminViolations.slice(0, 3).join(' | '));

  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const gtm = [];
  const beacons = [];
  const violations = [];
  await ctx.route('https://www.googletagmanager.com/**', (r) => { gtm.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
  await ctx.route(/google-analytics\.com|analytics\.google\.com|doubleclick\.net|facebook\.net/, (r) => r.abort());
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(m.text()); });
  page.on('request', (r) => { if (r.url().endsWith('/api/collect')) beacons.push(r.url()); });
  await page.goto(`${S}/`);
  const banner = page.getByTestId('cookie-banner');
  await banner.waitFor({ timeout: 60000 });
  await banner.getByRole('button', { name: 'Accept all' }).click();
  await page.waitForTimeout(1500);
  for (const p of ['/courses', '/contact', '/legal/privacy', '/legal/cookies', '/login', '/signup']) { await page.goto(`${S}${p}`); await page.waitForTimeout(400); }
  ck('Google Analytics script requested after consent', gtm.some((u) => u.includes(`gtag/js?id=${GA_ID}`)), gtm.join(' '));
  const cfg = await page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)).filter((a) => a[0] === 'config').length);
  ck('Google Analytics configured on the page', cfg > 0);
  ck('Our own analytics beacons sent', beacons.length >= 3, String(beacons.length));
  ck('Public pages: no CSP violations', violations.length === 0, violations.slice(0, 3).join(' | '));
  await browser.close();

  console.log(fails ? `\n${fails} failed` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
