// Loads Google's REAL gtag.js against a DEMO-mode build and records every hit it tries to send, while BLOCKING all of
// them (nothing reaches Google Analytics; only the public script is downloaded). Shows exactly what Google would get,
// including what the property's own Enhanced Measurement settings add (e.g. history-change page views).
//   SITE=http://localhost:3000 CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node test-harness/analytics-real-gtag.js
let pw;
try { pw = require('playwright'); } catch { pw = require('playwright-core'); }
const S = process.env.SITE || 'http://localhost:3000';
const GA_ID = 'G-P6WR6990K2';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
let fails = 0;
const ck = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${detail}`}`); if (!ok) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const admin = await (await browser.newContext({ userAgent: UA })).newPage();
  await admin.goto(`${S}/login`);
  await Promise.all([admin.waitForURL('**/admin'), admin.locator('form:has(input[name="role"][value="admin"]) button').first().click()]);
  await admin.goto(`${S}/admin/settings/addons`);
  await admin.locator('#f-analytics-enabled').setChecked(true, { force: true });
  await admin.fill('#f-analytics-id', GA_ID);
  await admin.getByRole('button', { name: 'Save changes' }).click();
  await admin.getByText('saved', { exact: false }).first().waitFor({ timeout: 10000 });

  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();
  const hits = []; // one entry per event: { en, dl, dr, dt, raw }
  let script = 0;
  await ctx.route(/googletagmanager\.com\/gtag\/js/, (r) => { script++; r.continue(); });
  await ctx.route(/google-analytics\.com|analytics\.google\.com|googletagmanager\.com\/(g|td)\/|doubleclick\.net/, (r) => {
    const req = r.request();
    const url = new URL(req.url());
    const lines = (req.postData() || '').split('\n').filter(Boolean);
    for (const line of lines.length ? lines : ['']) {
      const p = new URLSearchParams(`${url.search.slice(1)}&${line}`);
      hits.push({ en: p.get('en'), dl: p.get('dl'), dr: p.get('dr'), dt: p.get('dt'), raw: `${req.url()} ${line}` });
    }
    r.abort(); // never sent
  });
  const views = () => hits.filter((h) => h.en === 'page_view');

  await page.goto(`${S}/`);
  await wait(3000);
  ck('No hit and no script before consent', hits.length === 0 && script === 0);
  await page.getByTestId('cookie-banner').getByRole('button', { name: 'Accept all' }).click();
  await wait(6000);
  ck('Real gtag.js loaded once', script === 1, String(script));
  ck('Exactly one page_view hit after consent', views().length === 1, JSON.stringify(views()));
  ck('page_view address is the clean path', views()[0]?.dl === `${S}/`, views()[0]?.dl);

  await page.locator('a[href="/about"]').first().click();
  await page.waitForURL(`${S}/about`);
  await wait(6000);
  const nav = views();
  ck('Client-side navigation: exactly one more page_view (fails if the property still has "page changes based on browser history" on)', nav.length === 2, JSON.stringify(nav.map((h) => h.dl)));
  ck('Navigation page_view has the previous page as referrer', nav[1]?.dr === `${S}/`, nav[1]?.dr);

  await page.goto(`${S}/courses?q=secret%40example.com&utm_term=secretword&utm_source=news`);
  await wait(6000);
  ck('Full load with a query: address stripped to /courses?utm_source=news', views().at(-1)?.dl === `${S}/courses?utm_source=news`, views().at(-1)?.dl);

  await page.goto(`${S}/login`);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.locator('form:has(input[name="role"][value="learner"]) button').first().click()]);
  await page.goto(`${S}/dashboard`);
  await wait(2000);
  const onPrivate = hits.length;
  await page.mouse.wheel(0, 20000); // would trigger a scroll event
  await page.evaluate(() => { const a = document.createElement('a'); a.href = 'https://example.com/video?token=SECRET789'; a.target = '_blank'; document.body.append(a); a.click(); });
  await wait(6000);
  ck('No hits at all on a private page (scroll, outbound click)', hits.length === onPrivate, JSON.stringify(hits.slice(onPrivate).map((h) => h.en)));

  await page.locator('a[href="/courses"]').first().click();
  await page.waitForURL(`${S}/courses`);
  await wait(6000);
  ck('Back on a public page: page_view sent again with referrer /private', views().at(-1)?.dl === `${S}/courses` && views().at(-1)?.dr === `${S}/private`, JSON.stringify(views().at(-1)));

  const everything = hits.map((h) => decodeURIComponent(h.raw)).join('\n');
  if (process.env.DUMP) {
    for (const h of hits) {
      const keep = decodeURIComponent(h.raw).replace(/^[^?]*\?/, '').split(/[& ]/).filter((p) => /^(en|dl|dr|dt|ep\.|epn\.|up\.)/.test(p));
      console.log('HIT', h.en, keep.join('  '));
    }
  }
  ck('No email, search words, reset code or private paths in any hit', !/secret|SECRET|@example|\/dashboard|\/account|token=/.test(everything), everything.slice(0, 400));

  await page.getByTestId('cookie-settings').first().click();
  const before = hits.length;
  await page.locator('#ck-analytics').click();
  await Promise.all([page.waitForEvent('load'), page.getByTestId('cookie-preferences').getByRole('button', { name: 'Save choices' }).click()]);
  await page.locator('a[href="/about"]').first().click();
  await wait(6000);
  ck('After withdrawing consent: no more hits', hits.length === before, JSON.stringify(hits.slice(before).map((h) => h.en)));
  ck('After withdrawing consent: no Google cookies', !(await ctx.cookies()).some((c) => c.name.startsWith('_ga')));

  console.log(`\nEvents gtag.js tried to send (all blocked): ${JSON.stringify(hits.map((h) => h.en))}`);
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
