// Browser checks for cookie consent, Google Analytics and the analytics dashboard, against a DEMO-mode build
// (no Supabase keys, so nothing touches a real database). Google's script is stubbed: nothing is sent to Google.
//   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= SUPABASE_SERVICE_ROLE_KEY= npm run build
//   (same variables) npx next start -p 3100
//   SITE=http://localhost:3100 CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node test-harness/analytics-e2e.js
let pw;
try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const S = process.env.SITE || 'http://localhost:3100';
const GA_ID = 'G-P6WR6990K2';
let fails = 0;
const ck = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`); if (!ok) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Headless Chrome says "HeadlessChrome", which /api/collect drops as a bot; use a normal browser's user agent.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** A visitor tab that records Google requests and analytics beacons. */
async function visitor(browser) {
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const log = { gtm: [], beacons: [], errors: [] };
  await ctx.route('https://www.googletagmanager.com/**', (r) => { log.gtm.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }); });
  await ctx.route(/google-analytics\.com|doubleclick\.net|facebook\.net/, (r) => { log.gtm.push(r.request().url()); r.abort(); });
  page.on('request', (r) => { if (r.url().endsWith('/api/collect')) log.beacons.push(JSON.parse(r.postData() || '{}')); });
  page.on('pageerror', (e) => log.errors.push(e.message));
  const gtag = () => page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a)).map(([c, x, y]) => ({ c, x, y })));
  const views = async () => (await gtag()).filter((e) => e.c === 'event' && e.x === 'page_view').map((e) => e.y.page_location);
  const cookie = async (n) => (await ctx.cookies()).find((c) => c.name === n)?.value;
  return { ctx, page, log, gtag, views, cookie };
}

async function login(page, role) {
  await page.goto(`${S}/login`);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.locator(`form:has(input[name="role"][value="${role}"]) button`).first().click()]);
}

async function setGa(admin, enabled, id) {
  await admin.goto(`${S}/admin/settings/addons`);
  await admin.locator('#f-analytics-enabled').setChecked(enabled, { force: true }); // drawn as a switch under the sticky header
  await admin.fill('#f-analytics-id', id);
  await admin.getByRole('button', { name: 'Save changes' }).click();
  await admin.getByText('saved', { exact: false }).first().waitFor({ timeout: 10000 });
}

async function accept(page) {
  const banner = page.getByTestId('cookie-banner');
  await banner.waitFor({ timeout: 60000 });
  await banner.getByRole('button', { name: 'Accept all' }).click();
}

async function prefs(page, analytics) {
  await page.getByTestId('cookie-settings').first().click();
  const sw = page.locator('#ck-analytics');
  if ((await sw.isChecked()) !== analytics) await sw.click();
  await page.getByTestId('cookie-preferences').getByRole('button', { name: 'Save choices' }).click();
}

(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

  // Admin switches Google Analytics on (demo mode: saved in memory only).
  const adminCtx = await browser.newContext({ userAgent: UA });
  const admin = await adminCtx.newPage();
  const adminGtm = [];
  await adminCtx.route('https://www.googletagmanager.com/**', (r) => { adminGtm.push(r.request().url()); r.fulfill({ status: 200, body: '' }); });
  await login(admin, 'admin');
  await setGa(admin, true, GA_ID);
  ck('Admin → Addon saves the Measurement ID', (await admin.inputValue('#f-analytics-id')) === GA_ID);

  // 0. Dashboard with an empty database (nothing recorded yet on this fresh demo server).
  await admin.goto(`${S}/admin/analytics`);
  const emptyText = await admin.locator('main').innerText();
  ck('Empty database: dashboard renders', await admin.getByTestId('analytics-dashboard').isVisible());
  ck('Empty database: empty states shown', emptyText.includes('Nothing in this period.'));
  ck('Empty database: zero page views, no invented numbers', /Page views\s+0\b/.test(emptyText), emptyText.slice(emptyText.indexOf('Page views'), emptyText.indexOf('Page views') + 40));

  // 1. Before any choice: nothing optional runs.
  const v = await visitor(browser);
  await v.page.goto(`${S}/`);
  await v.page.getByTestId('cookie-banner').waitFor();
  await wait(1500);
  ck('Banner shown on first visit', await v.page.getByTestId('cookie-banner').isVisible());
  ck('No Google request before consent', v.log.gtm.length === 0, v.log.gtm.join(' '));
  ck('No analytics beacon before consent', v.log.beacons.length === 0);
  ck('No dataLayer before consent', (await v.gtag()).length === 0);

  // 2. Reject optional cookies: still nothing, on this page and the next.
  await v.page.getByRole('button', { name: 'Reject optional cookies' }).first().click();
  await v.page.goto(`${S}/courses`);
  await wait(1500);
  ck('Reject saves analytics off', (await v.cookie('sd_consent'))?.startsWith('1.a0.m0.'), await v.cookie('sd_consent'));
  ck('No Google request after rejecting', v.log.gtm.length === 0);
  ck('No beacon after rejecting', v.log.beacons.length === 0);
  ck('No banner after choosing', !(await v.page.getByTestId('cookie-banner').isVisible()));

  // 3. Accept analytics from Cookie settings, without a reload.
  await prefs(v.page, true);
  await wait(1500);
  ck('Google script loads once after consent', v.log.gtm.filter((u) => u.includes('gtag/js')).length === 1, v.log.gtm.join(' '));
  ck('gtag.js uses the configured ID', v.log.gtm.some((u) => u.includes(`id=${GA_ID}`)));
  const cfg = (await v.gtag()).filter((e) => e.c === 'config');
  ck('One config call, automatic page view off, Signals and ad personalisation off', cfg.length === 1 && cfg[0].x === GA_ID && cfg[0].y.send_page_view === false && cfg[0].y.allow_google_signals === false && cfg[0].y.allow_ad_personalization_signals === false, JSON.stringify(cfg));
  ck('Exactly one page view on consent', JSON.stringify(await v.views()) === JSON.stringify([`${S}/courses`]), JSON.stringify(await v.views()));
  ck('One first-party beacon on consent', v.log.beacons.filter((b) => !b.k).length === 1, JSON.stringify(v.log.beacons));

  // 4. Client-side navigation: one more page view each.
  await v.page.locator('a[href="/about"]').first().click();
  await v.page.waitForURL(`${S}/about`);
  await wait(1200);
  ck('Navigation adds exactly one page view', JSON.stringify(await v.views()) === JSON.stringify([`${S}/courses`, `${S}/about`]), JSON.stringify(await v.views()));
  ck('Navigation adds one beacon', v.log.beacons.filter((b) => !b.k).length === 2);

  // 5. Saving preferences again with analytics still on: no second script, no extra page view.
  await prefs(v.page, true);
  await wait(1000);
  ck('Re-saving consent adds no page view', (await v.views()).length === 2);
  ck('Re-saving consent loads no second script', v.log.gtm.filter((u) => u.includes('gtag/js')).length === 1);

  // 6. URL privacy on a full page load with a query string.
  await v.page.goto(`${S}/courses?q=priya%40example.com&utm_source=Insta&utm_campaign=Diwali%20Sale&utm_term=secretword&next=/dashboard`);
  await wait(1500);
  ck('Query string stripped; utm tags cleaned; utm_term dropped', JSON.stringify(await v.views()) === JSON.stringify([`${S}/courses?utm_source=insta&utm_campaign=diwalisale`]), JSON.stringify(await v.views()));
  const all = JSON.stringify(await v.gtag());
  ck('No email or search words in anything sent to Google', !all.includes('priya') && !all.includes('example.com') && !all.includes('secretword'), all.slice(0, 300));

  // 6b. Referrers: our private pages and other sites' paths never reach Google.
  await v.page.goto(`${S}/about`, { referer: `${S}/account/reset-password?code=SECRET123` });
  await wait(1500);
  let ev = (await v.gtag()).filter((e) => e.c === 'event' && e.x === 'page_view');
  ck('Referrer from our private page sent as /private', ev.length === 1 && ev[0].y.page_referrer === `${S}/private`, JSON.stringify(ev));
  ck('Reset code never in anything sent to Google', !JSON.stringify(await v.gtag()).includes('SECRET123'));
  await v.page.goto(`${S}/help`, { referer: 'https://mail.example.org/inbox?msg=SECRET456' });
  await wait(1500);
  ev = (await v.gtag()).filter((e) => e.c === 'event' && e.x === 'page_view');
  ck('Referrer from another site sent as its address only', ev.length === 1 && ev[0].y.page_referrer === 'https://mail.example.org/', JSON.stringify(ev));
  await v.page.locator('a[href="/about"]').first().click();
  await v.page.waitForURL(`${S}/about`);
  await wait(1200);
  ev = (await v.gtag()).filter((e) => e.c === 'event' && e.x === 'page_view');
  ck('Client-side navigation: referrer is the previous cleaned page', ev.length === 2 && ev[1].y.page_referrer === `${S}/help`, JSON.stringify(ev.map((e) => e.y)));
  ck('Page titles follow the page', ev.length === 2 && ev[0].y.page_title !== ev[1].y.page_title, JSON.stringify(ev.map((e) => e.y.page_title)));

  // 7. Personal pages.
  await v.page.goto(`${S}/bookings/7d1c2f3e-1111-4222-8333-444455556666/sent`);
  await wait(1200);
  const bk = await v.views();
  ck('Booking sent page: no booking id', bk.every((u) => !u.includes('7d1c2f3e')), JSON.stringify(bk));
  await v.page.goto(`${S}/certificates/SD-TEST-123`);
  await wait(1200);
  ck('Certificate code collapsed', JSON.stringify(await v.views()) === JSON.stringify([`${S}/certificates/[code]`]), JSON.stringify(await v.views()));
  await login(v.page, 'learner');
  await v.page.goto(`${S}/dashboard`);
  await wait(1500);
  const dash = await v.gtag();
  ck('Dashboard: no page view', dash.filter((e) => e.c === 'event').length === 0, JSON.stringify(dash.filter((e) => e.c === 'event')));
  ck('Dashboard: reported only as /private', dash.filter((e) => e.c === 'set').every((e) => e.x.page_location === `${S}/private` && e.x.page_title === 'Private page'));
  ck('Dashboard: Google switched off (ga-disable)', await v.page.evaluate((id) => window[`ga-disable-${id}`] === true, GA_ID));
  await v.page.locator('a[href="/courses"]').first().click();
  await v.page.waitForURL(`${S}/courses`);
  await wait(1200);
  ev = (await v.gtag()).filter((e) => e.c === 'event' && e.x === 'page_view');
  ck('Back on a public page: Google on again, one page view, referrer /private',
    (await v.page.evaluate((id) => window[`ga-disable-${id}`] === false, GA_ID)) && ev.length === 1 && ev[0].y.page_referrer === `${S}/private`, JSON.stringify(ev.map((e) => e.y)));

  // 8. Withdraw consent: Google is told, the page reloads, cookies go, nothing loads again.
  await v.page.goto(`${S}/about`);
  await wait(1200);
  await v.page.evaluate(() => {
    document.cookie = '_ga=GA1.1.123.456; Path=/';
    const push = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = (a) => {
      sessionStorage.setItem('last-gtag', JSON.stringify(Array.from(a)));
      sessionStorage.setItem('ga-off', String(window['ga-disable-G-P6WR6990K2']));
      return push(a);
    };
  });
  const before = v.log.gtm.length;
  await Promise.all([v.page.waitForEvent('load'), prefs(v.page, false)]);
  await wait(1500);
  ck('Withdrawal sends consent denied to Google', (await v.page.evaluate(() => sessionStorage.getItem('last-gtag'))) === JSON.stringify(['consent', 'update', { analytics_storage: 'denied' }]));
  ck('Withdrawal switches Google off before telling it', (await v.page.evaluate(() => sessionStorage.getItem('ga-off'))) === 'true');
  ck('Withdrawal saves analytics off', (await v.cookie('sd_consent'))?.startsWith('1.a0.'));
  ck('Withdrawal deletes _ga and the visitor ID', !(await v.cookie('_ga')) && !(await v.cookie('sd_vid')));
  ck('No Google script after withdrawal', v.log.gtm.length === before && (await v.gtag()).length === 0);
  const beaconsBefore = v.log.beacons.length;
  await v.page.locator('a[href="/courses"]').first().click();
  await wait(1200);
  ck('No beacons after withdrawal', v.log.beacons.length === beaconsBefore);

  // 9. Page speed beacons only came with consent.
  ck('Page-speed beacons sent while consent was on', v.log.beacons.some((b) => b.k === 'vital'), JSON.stringify(v.log.beacons.filter((b) => b.k)));

  // 10. Admin pages never load Google Analytics.
  await admin.evaluate(() => { document.cookie = `sd_consent=1.a1.m0.${Math.floor(Date.now() / 1000)}; Path=/`; });
  for (const p of ['/admin', '/admin/analytics', '/admin/settings/addons']) await admin.goto(`${S}${p}`);
  await wait(1000);
  ck('No Google script on admin pages (with consent)', adminGtm.length === 0, adminGtm.join(' '));

  // 11. Server re-checks consent: an error beacon without consent is not stored.
  const anon = await visitor(browser);
  await anon.page.goto(`${S}/help`);
  await anon.page.evaluate(() => fetch('/api/collect', { method: 'POST', body: JSON.stringify({ k: 'error', u: '/help' }), headers: { 'content-type': 'application/json' } }));
  const ok = await visitor(browser);
  await ok.page.goto(`${S}/contact`);
  await accept(ok.page);
  await wait(1200);
  await ok.page.evaluate(() => fetch('/api/collect', { method: 'POST', body: JSON.stringify({ k: 'error', u: '/contact' }), headers: { 'content-type': 'application/json' } }));

  // 12. Dashboard: renders, shows the recorded data, admin only.
  await admin.goto(`${S}/admin/analytics`);
  ck('Dashboard renders', await admin.getByTestId('analytics-dashboard').isVisible());
  ck('Business results render', await admin.getByTestId('business-results').isVisible());
  const text = await admin.locator('main').innerText();
  ck('Campaign from utm_campaign listed', text.includes('diwali'));
  ck('Booking-sent page listed without an id', !text.includes('7d1c2f3e'));
  ck('Search with an email never shown', !text.includes('priya@example.com'));
  // innerText is upper-cased by CSS on table headers; the errors table is the last table before the Google Analytics card.
  const errIdx = text.toUpperCase().indexOf('PAGE WITH AN ERROR');
  const errTable = errIdx < 0 ? '' : text.slice(errIdx, text.indexOf('Google Analytics', errIdx));
  ck('Errors table found', errIdx >= 0);
  ck('Error with consent recorded', /\/contact\s+\d/.test(errTable), errTable);
  ck('Error without consent not recorded', errIdx >= 0 && !errTable.includes('/help'), errTable);
  ck('No payment figures invented', text.includes('Online payments aren’t switched on'));
  ck('Browsers listed', text.includes('Chrome'));
  ck('Funnel end labelled as a confirmation page, not a completed booking', text.includes('Visits reaching a confirmation page') && !text.includes('sent a form'));
  for (const g of ['week', 'month']) {
    await admin.goto(`${S}/admin/analytics?g=${g}`);
    ck(`${g === 'week' ? 'Weekly' : 'Monthly'} trend renders`, (await admin.locator('main').innerText()).includes(g === 'week' ? 'Weekly trend' : 'Monthly trend'));
  }
  const out = await browser.newContext();
  const outPage = await out.newPage();
  await outPage.goto(`${S}/admin/analytics`);
  ck('Logged out: dashboard not shown', !(await outPage.getByTestId('analytics-dashboard').count()), outPage.url());
  const learner = await visitor(browser);
  await login(learner.page, 'learner');
  await learner.page.goto(`${S}/admin/analytics`);
  ck('Learner: dashboard not shown', !(await learner.page.getByTestId('analytics-dashboard').count()), learner.page.url());

  // 13. A malformed Measurement ID keeps Google Analytics off.
  await setGa(admin, true, 'UA-12345-1');
  const bad = await visitor(browser);
  await bad.page.goto(`${S}/`);
  await accept(bad.page);
  await wait(1500);
  ck('Malformed ID: no Google script', bad.log.gtm.length === 0);
  // Switched off: no Google script even with consent.
  await setGa(admin, false, GA_ID);
  const off = await visitor(browser);
  await off.page.goto(`${S}/`);
  await accept(off.page);
  await wait(1500);
  ck('Switched off in Admin: no Google script', off.log.gtm.length === 0);
  ck('Switched off in Admin: first-party analytics still on', off.log.beacons.length > 0);

  // 14. Existing pages still load without script errors.
  const site = await visitor(browser);
  for (const p of ['/', '/courses', '/services', '/about', '/contact', '/help', '/blog', '/group-booking', '/franchise', '/legal/privacy', '/legal/cookies', '/login', '/signup']) {
    const r = await site.page.goto(`${S}${p}`);
    ck(`Page ${p} loads`, r.status() === 200, String(r.status()));
  }
  for (const p of ['/admin', '/admin/reports/enrolments', '/admin/reports/bookings', '/admin/settings/addons', '/admin/cms']) {
    const r = await admin.goto(`${S}${p}`);
    ck(`Admin ${p} loads`, r.status() === 200, String(r.status()));
  }
  ck('No script errors on any visitor page', [v, site, ok, bad, off].every((x) => !x.log.errors.length), [v, site, ok, bad, off].flatMap((x) => x.log.errors).join(' | '));

  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
