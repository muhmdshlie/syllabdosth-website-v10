import 'server-only';
/**
 * First-party website analytics (Admin → Reports → Website Analytics).
 * Only recorded after the visitor accepts analytics cookies. One row per page view, holding a random
 * visitor id (never the account), a cleaned path, the device type and, for the first page of a visit,
 * where the visitor came from. No IP address, user agent, names, emails or form contents are stored.
 */
import { isDemo } from './config';
import { publicPath } from './consent';
import { todayIST } from './format';
import { newId, table } from './store';
import { createAdminClient } from './supabase/server';

const V1_KINDS = ['page', 'course', 'enroll', 'enroll_sent', 'search'] as const;
export type PageKind = (typeof V1_KINDS)[number] | 'service' | 'booking_sent' | 'group' | 'group_sent' | 'apply' | 'apply_sent';
export type Device = 'mobile' | 'tablet' | 'desktop';
export type Browser = 'chrome' | 'safari' | 'edge' | 'firefox' | 'samsung' | 'opera' | 'in_app' | 'other';
export type Medium = 'direct' | 'search' | 'social' | 'referral' | 'campaign' | 'email';

export type AnalyticsEvent = {
  day: string; visitor_id: string; is_returning: boolean; path: string; page_kind: PageKind; course_slug: string | null;
  search_term: string | null; search_results: number | null; landing: boolean; source: string | null; medium: Medium | null; device: Device;
  campaign?: string | null; browser?: Browser;
};

const SAFE_PATH = /^\/[A-Za-z0-9\-._/[\]]*$/;

/** Path without query string, or null when it must not be recorded. Codes in URLs are collapsed. */
export function cleanPath(pathname: string): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!p.startsWith('/') || p.length > 200 || !SAFE_PATH.test(p)) return null;
  return publicPath(p);
}

/** Search words as typed, minus anything that looks like contact details. Null → counted but not shown. */
export function cleanTerm(q: string): string | null {
  const t = q.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!t || /@/.test(t) || /\d{5,}/.test(t.replace(/[\s\-+().]/g, ''))) return null;
  return t;
}

export function classify(path: string, q: string | null): { kind: PageKind; course: string | null; term: string | null } {
  if (path === '/courses' && q?.trim()) return { kind: 'search', course: null, term: cleanTerm(q) };
  const m = /^\/courses\/([a-z0-9-]{1,120})(\/enroll(\/sent)?)?$/.exec(path);
  if (m) return { kind: m[3] ? 'enroll_sent' : m[2] ? 'enroll' : 'course', course: m[1], term: null };
  const kind: PageKind = /^\/services\/[^/]+$/.test(path) ? 'service'
    : path === '/bookings/[id]/sent' ? 'booking_sent'
    : path === '/group-booking' ? 'group'
    : path === '/group-booking/sent' ? 'group_sent'
    : path === '/apply/sent' ? 'apply_sent'
    : /^\/apply\/[^/]+$/.test(path) ? 'apply'
    : 'page';
  return { kind, course: null, term: null };
}

export function deviceFrom(ua: string, touch: boolean): Device {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && touch)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Browser family only (never the version or the full user agent). Order matters: Edge, Opera and Samsung also say "Chrome". */
export function browserFrom(ua: string): Browser {
  if (/FBAN|FBAV|Instagram|Line\//.test(ua)) return 'in_app';
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge';
  if (/SamsungBrowser/.test(ua)) return 'samsung';
  if (/OPR\/|Opera/.test(ua)) return 'opera';
  if (/Firefox|FxiOS/.test(ua)) return 'firefox';
  if (/Chrome|CriOS/.test(ua)) return 'chrome';
  if (/Safari/.test(ua)) return 'safari';
  return 'other';
}

export const isBot = (ua: string) => !ua || /bot|crawl|spider|slurp|headless|lighthouse|pingdom|preview|externalhit|curl|wget|python|axios|node-fetch|go-http/i.test(ua);

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|startpage)\./;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|instagram\.com|t\.co|twitter\.com|x\.com|linkedin\.com|lnkd\.in|youtube\.com|youtu\.be|whatsapp\.com|wa\.me|pinterest\.com|pin\.it|reddit\.com|threads\.net|t\.me|telegram\.org)$/;

const utmTag = (v: string | null | undefined, max: number) => (v ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, max);

/** Where a visit came from: UTM tags first, then the referring site's domain (never the full URL). */
export function sourceFrom(referrer: string, utm: { source?: string | null; medium?: string | null; campaign?: string | null }, ownHost: string): { source: string; medium: Medium; campaign?: string } {
  const tag = utmTag(utm.source, 40);
  if (tag) {
    const campaign = utmTag(utm.campaign, 60);
    return { source: tag, medium: /^e-?mail|newsletter$/i.test(utm.medium ?? '') ? 'email' : 'campaign', ...(campaign && { campaign }) };
  }
  let host = '';
  try { host = referrer ? new URL(referrer).hostname.toLowerCase().replace(/^www\./, '') : ''; } catch { /* not a URL */ }
  if (!host || host === ownHost.replace(/^www\./, '')) return { source: 'direct', medium: 'direct' };
  return { source: host.slice(0, 80), medium: SEARCH_ENGINES.test(host) ? 'search' : SOCIAL.test(host) ? 'social' : 'referral' };
}

// A visitor can send at most this many page views a minute (per server instance), against scripted spam.
const throttle = new Map<string, { n: number; until: number }>();
function allowed(visitor: string) {
  const now = Date.now();
  const t = throttle.get(visitor);
  if (!t || t.until < now) {
    if (throttle.size > 5000) throttle.clear();
    throttle.set(visitor, { n: 1, until: now + 60_000 });
    return true;
  }
  return ++t.n <= 60;
}

let v1Until = 0; // until then, insert page views in the pre-migration shape (see below)

export async function recordEvent(e: AnalyticsEvent): Promise<void> {
  if (!allowed(e.visitor_id)) return;
  if (isDemo) {
    table<AnalyticsEvent & { id: string; created_at: string }>('analytics_events').push({ ...e, id: newId('an'), created_at: new Date().toISOString() });
    return;
  }
  const db = createAdminClient();
  purgeDaily(db);
  const { campaign, browser, ...v1 } = e;
  const legacy = { ...v1, page_kind: (V1_KINDS as readonly string[]).includes(v1.page_kind) ? v1.page_kind : 'page' };
  if (Date.now() < v1Until) {
    const { error } = await db.from('analytics_events').insert(legacy);
    if (error) throw new Error(error.message);
    return;
  }
  let { error } = await db.from('analytics_events').insert({ ...v1, browser, ...(campaign && { campaign }) });
  // Before the v2 migration the new page kinds and columns don't exist: keep the page view the old way,
  // and skip the new shape for a while instead of trying it on every page view.
  if (error && ['23514', '42703', 'PGRST204'].includes(error.code ?? '')) {
    ({ error } = await db.from('analytics_events').insert(legacy));
    if (!error) v1Until = Date.now() + 10 * 60_000;
  }
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ site health */

export type Vital = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
/** Google's Core Web Vitals limits: up to `good` is good, above `poor` is poor. ms, except CLS (a score). */
export const VITALS: Record<Vital, { label: string; good: number; poor: number }> = {
  CLS: { label: 'Layout shift', good: 0.1, poor: 0.25 },
  FCP: { label: 'First content', good: 1800, poor: 3000 },
  INP: { label: 'Tap response', good: 200, poor: 500 },
  LCP: { label: 'Main content', good: 2500, poor: 4000 },
  TTFB: { label: 'Server response', good: 800, poor: 1800 },
};

/** One page-speed measurement or one error, for a cleaned path. No visitor id is stored with it. */
export type HealthEvent = { day: string; path: string; metric: Vital | 'error'; value: number; device: Device };

export async function recordHealth(h: HealthEvent, visitor: string): Promise<void> {
  if (!allowed(`h:${visitor}`)) return;
  if (isDemo) {
    table<HealthEvent & { id: string; created_at: string }>('site_vitals').push({ ...h, id: newId('sv'), created_at: new Date().toISOString() });
    return;
  }
  const { error } = await createAdminClient().from('site_vitals').insert(h);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ dashboard */

type Count = { views: number; visitors: number };
export type AnalyticsSummary = {
  totals: { views: number; visitors: number; returning: number; visits: number; courseViews: number; searches: number; sessions: number; singlePage: number; converted: number };
  daily: { day: string; views: number; visitors: number; returning: number; sessions: number }[];
  weekly: ({ start: string } & Count)[];
  monthly: ({ start: string } & Count)[];
  pages: ({ path: string } & Count)[];
  courses: { slug: string; views: number; starts: number; sent: number }[];
  services: ({ path: string } & Count)[];
  entries: { path: string; visits: number; singlePage: number; converted: number }[];
  sources: { source: string; medium: Medium; visits: number; converted: number }[];
  campaigns: { campaign: string; source: string; medium: Medium; visits: number; converted: number }[];
  devices: { device: Device; visitors: number; views: number }[];
  browsers: { browser: Browser; visitors: number; views: number }[];
  searches: { term: string; count: number; zero: number }[];
  funnel: { viewed: number; started: number; sent: number };
  funnels: { serviceViewed: number; bookingSent: number; groupOpened: number; groupSent: number; applyOpened: number; applySent: number };
  vitals: { metric: Vital; samples: number; p75: number; good: number; poor: number }[];
  slowPages: { path: string; samples: number; p75: number }[];
  errors: { path: string; count: number }[];
};

/** v2 is false until the 20261023120000 migration has run: visits, campaigns, the new funnels and site health are then empty. */
export type AnalyticsResult = { ok: true; data: AnalyticsSummary; v2: boolean } | { ok: false; missing: boolean; message: string };

// Search words are listed only when this many searches used them, so a one-off entry can't single anyone out.
export const MIN_TERM_COUNT = 2;
const KEEP_DAYS = 395; // about 13 months, as promised in the privacy and cookie policies
let lastPurge = '';

/** Deletes old events at most once a day per server instance; runs on normal traffic so it never depends on an admin visit. */
function purgeDaily(db: ReturnType<typeof createAdminClient>) {
  const today = todayIST();
  if (lastPurge === today) return;
  lastPurge = today;
  void db.rpc('analytics_purge', { p_keep_days: KEEP_DAYS }).then(() => undefined, () => undefined);
}

const EMPTY_FUNNELS: AnalyticsSummary['funnels'] = { serviceViewed: 0, bookingSent: 0, groupOpened: 0, groupSent: 0, applyOpened: 0, applySent: 0 };

/** Fills in what the v1 SQL function doesn't return, so the dashboard works before and after the migration. */
type V1Summary = Partial<Omit<AnalyticsSummary, 'totals' | 'daily' | 'sources' | 'funnels'>> & {
  totals: Omit<AnalyticsSummary['totals'], 'sessions' | 'singlePage' | 'converted'>;
  daily?: Omit<AnalyticsSummary['daily'][number], 'returning' | 'sessions'>[];
  sources?: Omit<AnalyticsSummary['sources'][number], 'converted'>[];
  funnels?: AnalyticsSummary['funnels'];
};

export function withDefaults(raw: V1Summary): AnalyticsSummary {
  return {
    weekly: [], monthly: [], services: [], entries: [], campaigns: [], browsers: [], vitals: [], slowPages: [], errors: [],
    pages: [], courses: [], devices: [], searches: [], funnel: { viewed: 0, started: 0, sent: 0 },
    ...raw,
    totals: { sessions: 0, singlePage: 0, converted: 0, ...raw.totals },
    daily: (raw.daily ?? []).map((d) => ({ returning: 0, sessions: 0, ...d })),
    sources: (raw.sources ?? []).map((s) => ({ converted: 0, ...s })),
    funnels: { ...EMPTY_FUNNELS, ...raw.funnels },
  };
}

/** Aggregated numbers for a date range (India-time days, inclusive). Callers must have checked the admin role. */
export async function siteAnalytics(from: string, to: string): Promise<AnalyticsResult> {
  if (isDemo) return { ok: true, v2: true, data: summarize(table<StoredEvent>('analytics_events'), from, to, table<StoredHealth>('site_vitals')) };
  const db = createAdminClient();
  purgeDaily(db);
  const { data, error } = await db.rpc('analytics_summary', { p_from: from, p_to: to, p_min_term: MIN_TERM_COUNT });
  if (error) {
    const missing = ['42883', '42P01', 'PGRST202', 'PGRST205'].includes(error.code ?? '');
    return { ok: false, missing, message: error.message };
  }
  const raw = data as V1Summary;
  return { ok: true, v2: 'sessions' in (raw.totals ?? {}), data: withDefaults(raw) };
}

type StoredEvent = AnalyticsEvent & { id?: string; created_at?: string };
type StoredHealth = HealthEvent & { id?: string; created_at?: string };

const SENT: PageKind[] = ['enroll_sent', 'booking_sent', 'group_sent', 'apply_sent'];
const VISIT_GAP = 30 * 60_000;
const DAY_MS = 86400_000;
const weekStart = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7) * DAY_MS).toISOString().slice(0, 10);

/** Like Postgres percentile_cont: linear between the two nearest values. */
function percentile(values: number[], p: number) {
  const v = [...values].sort((a, b) => a - b);
  const pos = p * (v.length - 1);
  const lo = Math.floor(pos);
  return v[lo] + (v[Math.ceil(pos)] - v[lo]) * (pos - lo);
}

/** Same numbers as the analytics_summary() SQL function, for demo mode. */
export function summarize(all: StoredEvent[], from: string, to: string, health: StoredHealth[] = []): AnalyticsSummary {
  const rows = all.filter((r) => r.day >= from && r.day <= to);
  const distinct = (list: AnalyticsEvent[]) => new Set(list.map((r) => r.visitor_id)).size;
  const group = <K extends string, R>(list: R[], key: (r: R) => K | null) => {
    const m = new Map<K, R[]>();
    for (const r of list) { const k = key(r); if (k !== null) m.set(k, [...(m.get(k) ?? []), r]); }
    return Array.from(m.entries());
  };
  const of = (kind: PageKind) => rows.filter((r) => r.page_kind === kind);
  const byDesc = <T>(n: (x: T) => number, s: (x: T) => string) => (a: T, b: T) => n(b) - n(a) || s(a).localeCompare(s(b));
  const counts = (list: StoredEvent[]) => ({ views: list.length, visitors: distinct(list) });

  // A visit starts after 30 minutes without a page view, or on an arrival from another site or a campaign link.
  // A direct load within 30 minutes (a reload, or the address typed again) stays in the same visit.
  const visits = group(rows, (r) => r.visitor_id).flatMap(([, list]) => {
    const sorted = [...list].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || String(a.id ?? '').localeCompare(String(b.id ?? '')));
    const out: StoredEvent[][] = [];
    let prev = 0;
    for (const r of sorted) {
      const t = Date.parse(r.created_at ?? '') || 0;
      if (!out.length || t - prev > VISIT_GAP || (r.landing && (r.source ?? 'direct') !== 'direct')) out.push([]);
      out[out.length - 1].push(r);
      prev = t;
    }
    return out.map((l) => ({
      day: l[0].day, entry: l[0].path, arrived: l[0].landing, source: l[0].source ?? 'direct', medium: (l[0].medium ?? 'direct') as Medium,
      campaign: l[0].campaign ?? null, views: l.length, converted: l.some((r) => SENT.includes(r.page_kind)),
    }));
  });
  type Visit = (typeof visits)[number];
  const visitStats = (l: Visit[]) => ({ visits: l.length, singlePage: l.filter((v) => v.views === 1).length, converted: l.filter((v) => v.converted).length });
  const arrived = visits.filter((v) => v.arrived);

  const vitals = health.filter((h) => h.day >= from && h.day <= to);
  const lcp = vitals.filter((h) => h.metric === 'LCP');

  return {
    totals: {
      views: rows.length, visitors: distinct(rows), returning: distinct(rows.filter((r) => r.is_returning)),
      visits: rows.filter((r) => r.landing).length, courseViews: of('course').length, searches: of('search').length,
      sessions: visits.length, singlePage: visitStats(visits).singlePage, converted: visitStats(visits).converted,
    },
    daily: group(rows, (r) => r.day).map(([day, l]) => ({
      day, ...counts(l), returning: distinct(l.filter((r) => r.is_returning)), sessions: visits.filter((v) => v.day === day).length,
    })).sort((a, b) => a.day.localeCompare(b.day)),
    weekly: group(rows, (r) => weekStart(r.day)).map(([start, l]) => ({ start, ...counts(l) })).sort((a, b) => a.start.localeCompare(b.start)),
    monthly: group(rows, (r) => `${r.day.slice(0, 7)}-01`).map(([start, l]) => ({ start, ...counts(l) })).sort((a, b) => a.start.localeCompare(b.start)),
    pages: group(rows, (r) => r.path).map(([path, l]) => ({ path, ...counts(l) })).sort(byDesc((x) => x.views, (x) => x.path)).slice(0, 15),
    courses: group(rows, (r) => r.course_slug).map(([slug, l]) => ({
      slug, views: l.filter((r) => r.page_kind === 'course').length, starts: l.filter((r) => r.page_kind === 'enroll').length, sent: l.filter((r) => r.page_kind === 'enroll_sent').length,
    })).sort(byDesc((x) => x.views, (x) => x.slug)).slice(0, 15),
    services: group(of('service'), (r) => r.path).map(([path, l]) => ({ path, ...counts(l) })).sort(byDesc((x) => x.views, (x) => x.path)).slice(0, 15),
    entries: group(visits, (v) => v.entry).map(([path, l]) => ({ path, ...visitStats(l) })).sort(byDesc((x) => x.visits, (x) => x.path)).slice(0, 15),
    sources: group(arrived, (v) => `${v.source}|${v.medium}`).map(([k, l]) => {
      const [source, medium] = k.split('|');
      return { source, medium: medium as Medium, visits: l.length, converted: visitStats(l).converted };
    }).sort(byDesc((x) => x.visits, (x) => x.source)).slice(0, 12),
    campaigns: group(arrived, (v) => (v.campaign ? `${v.campaign}|${v.source}|${v.medium}` : null)).map(([k, l]) => {
      const [campaign, source, medium] = k.split('|');
      return { campaign, source, medium: medium as Medium, visits: l.length, converted: visitStats(l).converted };
    }).sort(byDesc((x) => x.visits, (x) => x.campaign)).slice(0, 15),
    devices: group(rows, (r) => r.device).map(([device, l]) => ({ device, visitors: distinct(l), views: l.length })).sort(byDesc((x) => x.visitors, (x) => x.device)),
    browsers: group(rows, (r) => r.browser ?? null).map(([browser, l]) => ({ browser, visitors: distinct(l), views: l.length })).sort(byDesc((x) => x.visitors, (x) => x.browser)),
    searches: group(of('search'), (r) => r.search_term).filter(([, l]) => l.length >= MIN_TERM_COUNT)
      .map(([term, l]) => ({ term, count: l.length, zero: l.filter((r) => r.search_results === 0).length })).sort(byDesc((x) => x.count, (x) => x.term)).slice(0, 20),
    funnel: { viewed: distinct(of('course')), started: distinct(of('enroll')), sent: distinct(of('enroll_sent')) },
    funnels: {
      serviceViewed: distinct(of('service')), bookingSent: distinct(of('booking_sent')), groupOpened: distinct(of('group')),
      groupSent: distinct(of('group_sent')), applyOpened: distinct(of('apply')), applySent: distinct(of('apply_sent')),
    },
    vitals: group(vitals.filter((h) => h.metric !== 'error'), (h) => h.metric as Vital).map(([metric, l]) => {
      const values = l.map((h) => h.value);
      return { metric, samples: l.length, p75: percentile(values, 0.75), good: values.filter((v) => v <= VITALS[metric].good).length, poor: values.filter((v) => v > VITALS[metric].poor).length };
    }).sort((a, b) => a.metric.localeCompare(b.metric)),
    slowPages: group(lcp, (h) => h.path).filter(([, l]) => l.length >= 3)
      .map(([path, l]) => ({ path, samples: l.length, p75: percentile(l.map((h) => h.value), 0.75) })).sort(byDesc((x) => x.p75, (x) => x.path)).slice(0, 10),
    errors: group(vitals.filter((h) => h.metric === 'error'), (h) => h.path).map(([path, l]) => ({ path, count: l.length })).sort(byDesc((x) => x.count, (x) => x.path)).slice(0, 10),
  };
}
