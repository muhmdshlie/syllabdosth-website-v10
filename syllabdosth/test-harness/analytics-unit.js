// Unit checks for lib/analytics.ts and lib/consent.ts (no server, no database).
// Run from syllabdosth/:  node test-harness/analytics-unit.js
const Module = require('module');
const path = require('path');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (req, ...rest) { // 'server-only' throws outside Next's server build
  return req === 'server-only' ? path.join(__dirname, 'analytics-unit.js') : resolve.call(this, req, ...rest);
};
for (const k of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) process.env[k] = ''; // demo mode
if (require.main !== module) return; // loaded as the 'server-only' stub

const jiti = require('jiti')(__filename, { interopDefault: true });
const A = jiti('../lib/analytics.ts');
const C = jiti('../lib/consent.ts');

let fails = 0;
const ck = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
  if (!ok) fails++;
};

// Paths: private pages never recorded, personal codes collapsed.
ck('public page kept', A.cleanPath('/courses/tailoring/'), '/courses/tailoring');
ck('dashboard private', A.cleanPath('/dashboard/pro'), null);
ck('account private', A.cleanPath('/account/reset-password'), null);
ck('admin private', A.cleanPath('/admin/analytics'), null);
ck('auth private', A.cleanPath('/auth/callback'), null);
ck('booking page private', A.cleanPath('/bookings/7d1c2f3e-1111-4222-8333-444455556666'), null);
ck('booking sent collapsed', A.cleanPath('/bookings/7d1c2f3e-1111-4222-8333-444455556666/sent'), '/bookings/[id]/sent');
ck('certificate code collapsed', A.cleanPath('/certificates/SD-2026-0042'), '/certificates/[code]');
ck('odd characters refused', A.cleanPath('/courses/<script>'), null);
ck('GA helper matches (private)', C.publicPath('/dashboard'), null);
ck('GA helper matches (booking sent)', C.publicPath('/bookings/abc/sent/'), '/bookings/[id]/sent');

// Page kinds.
const kind = (p, q = null) => A.classify(p, q).kind;
ck('course', kind('/courses/tailoring'), 'course');
ck('enroll', kind('/courses/tailoring/enroll'), 'enroll');
ck('enroll sent', kind('/courses/tailoring/enroll/sent'), 'enroll_sent');
ck('search', kind('/courses', 'saree'), 'search');
ck('service', kind('/services/bridal-makeup'), 'service');
ck('services list is a page', kind('/services'), 'page');
ck('booking sent', kind('/bookings/[id]/sent'), 'booking_sent');
ck('group', kind('/group-booking'), 'group');
ck('group sent', kind('/group-booking/sent'), 'group_sent');
ck('apply', kind('/apply/faculty'), 'apply');
ck('apply sent', kind('/apply/sent'), 'apply_sent');
ck('search with email hidden', A.classify('/courses', 'me@x.com').term, null);
ck('search with phone hidden', A.classify('/courses', '98450 12345').term, null);

// Sources and campaigns.
ck('utm campaign cleaned', A.sourceFrom('', { source: 'Instagram', medium: 'paid', campaign: 'Diwali Sale!' }, 'syllabdosth.com'),
  { source: 'instagram', medium: 'campaign', campaign: 'diwalisale' });
ck('campaign needs utm_source', A.sourceFrom('', { campaign: 'x' }, 'syllabdosth.com'), { source: 'direct', medium: 'direct' });
ck('search engine', A.sourceFrom('https://www.google.com/search?q=secret', {}, 'syllabdosth.com'), { source: 'google.com', medium: 'search' });

// Browser family only.
const UA = {
  chrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  in_app: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
};
for (const [want, ua] of Object.entries(UA)) ck(`browser ${want}`, A.browserFrom(ua), want);
ck('browser other', A.browserFrom('SomethingElse/1.0'), 'other');

// Summary (demo-mode mirror of the SQL function).
const ev = (visitor, min, path, page_kind, extra = {}) => ({
  day: extra.day ?? '2026-10-20', visitor_id: visitor, is_returning: false, path, page_kind, course_slug: extra.course ?? null,
  search_term: extra.term ?? null, search_results: null, landing: !!extra.landing, source: extra.source ?? null, medium: extra.medium ?? null,
  campaign: extra.campaign ?? null, device: extra.device ?? 'mobile', browser: extra.browser ?? 'chrome', created_at: new Date(Date.parse('2026-10-20T04:00:00Z') + min * 60_000).toISOString(), id: String(min).padStart(5, '0'),
});
const rows = [
  // Visitor a: one visit from an Instagram campaign that ends in a course enquiry, then a second visit 45 minutes later.
  ev('a', 0, '/', 'page', { landing: true, source: 'instagram', medium: 'campaign', campaign: 'diwali' }),
  ev('a', 2, '/courses/tailoring', 'course', { course: 'tailoring' }),
  ev('a', 4, '/courses/tailoring/enroll', 'enroll', { course: 'tailoring' }),
  ev('a', 6, '/courses/tailoring/enroll/sent', 'enroll_sent', { course: 'tailoring' }),
  ev('a', 51, '/courses', 'page'),
  // Visitor b: a one-page visit from Google, on a later week and month.
  ev('b', 0, '/services/makeup', 'service', { landing: true, source: 'google.com', medium: 'search', day: '2026-11-02', device: 'desktop' }),
  // Visitor c: service page then a booking request.
  ev('c', 0, '/services/makeup', 'service', { landing: true, source: 'direct', medium: 'direct' }),
  ev('c', 3, '/bookings/[id]/sent', 'booking_sent'),
  // Visitor d: types the address, then reloads 5 minutes later: one visit, not two.
  ev('d', 0, '/', 'page', { landing: true, source: 'direct', medium: 'direct' }),
  ev('d', 5, '/', 'page', { landing: true, source: 'direct', medium: 'direct' }),
];
const s = A.summarize(rows, '2026-10-01', '2026-11-30', [
  ...[1000, 2000, 3000, 5000].map((v, i) => ({ day: '2026-10-20', path: '/', metric: 'LCP', value: v, device: 'mobile', created_at: `2026-10-20T0${i}:00:00Z` })),
  { day: '2026-10-20', path: '/', metric: 'CLS', value: 0.3, device: 'mobile' },
  { day: '2026-10-20', path: '/courses', metric: 'error', value: 0, device: 'mobile' },
  { day: '2026-12-01', path: '/', metric: 'error', value: 0, device: 'mobile' }, // outside the range
]);
ck('views', s.totals.views, 10);
ck('visitors', s.totals.visitors, 4);
ck('visits split after 30 minutes, not on a reload', s.totals.sessions, 5);
ck('one-page visits', s.totals.singlePage, 2);
ck('visits with a sent form', s.totals.converted, 2);
ck('arrivals (v1 meaning kept)', s.totals.visits, 5);
ck('weeks (Monday start)', s.weekly.map((w) => [w.start, w.visitors]), [['2026-10-19', 3], ['2026-11-02', 1]]);
ck('months', s.monthly.map((m) => [m.start, m.views]), [['2026-10-01', 9], ['2026-11-01', 1]]);
ck('course funnel', s.funnel, { viewed: 1, started: 1, sent: 1 });
ck('other funnels', s.funnels, { serviceViewed: 2, bookingSent: 1, groupOpened: 0, groupSent: 0, applyOpened: 0, applySent: 0 });
ck('campaigns', s.campaigns, [{ campaign: 'diwali', source: 'instagram', medium: 'campaign', visits: 1, converted: 1 }]);
ck('sources count arrivals only', s.sources.map((x) => [x.source, x.visits, x.converted]), [['direct', 2, 1], ['google.com', 1, 0], ['instagram', 1, 1]]);
ck('entry pages', s.entries.map((x) => [x.path, x.visits, x.singlePage]), [['/', 2, 0], ['/services/makeup', 2, 1], ['/courses', 1, 1]]);
ck('services', s.services.map((x) => [x.path, x.views]), [['/services/makeup', 2]]);
ck('LCP p75 like percentile_cont', s.vitals.find((v) => v.metric === 'LCP'), { metric: 'LCP', samples: 4, p75: 3500, good: 2, poor: 1 });
ck('CLS poor', s.vitals.find((v) => v.metric === 'CLS').poor, 1);
ck('slow pages need 3 samples', s.slowPages, [{ path: '/', samples: 4, p75: 3500 }]);
ck('errors in range only', s.errors, [{ path: '/courses', count: 1 }]);
ck('browsers', s.browsers, [{ browser: 'chrome', visitors: 4, views: 10 }]);

// Before the v2 migration the SQL function returns the v1 shape: the dashboard still gets every key.
const v1 = A.withDefaults({ totals: { views: 1, visitors: 1, returning: 0, visits: 1, courseViews: 0, searches: 0 }, daily: [{ day: '2026-10-20', views: 1, visitors: 1 }], pages: [], courses: [], sources: [{ source: 'direct', medium: 'direct', visits: 1 }], devices: [], searches: [], funnel: { viewed: 0, started: 0, sent: 0 } });
ck('v1 totals filled', [v1.totals.sessions, v1.totals.views], [0, 1]);
ck('v1 lists filled', [v1.weekly, v1.campaigns, v1.vitals, v1.daily[0].sessions, v1.sources[0].converted, v1.funnels.bookingSent], [[], [], [], 0, 0, 0]);

console.log(fails ? `\n${fails} FAILED` : '\nAll passed');
process.exit(fails ? 1 : 0);
